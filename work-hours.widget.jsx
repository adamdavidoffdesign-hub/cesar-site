const TARGET_HOURS = 8;
const SETTINGS_KEY = "work-timer.widget.settings.v2";

export const refreshFrequency = 30000;

export const command = String.raw`bash -lc '
/usr/bin/python3 - <<'"'"'PY'"'"'
import datetime as dt
import json
import re
import subprocess

def run(command):
    return subprocess.run(
        command,
        shell=True,
        check=False,
        capture_output=True,
        text=True,
        errors="ignore",
    ).stdout


def parse_boot_time():
    timezone = dt.datetime.now().astimezone().tzinfo
    output = run("who -b").strip()
    match = re.search(r"system boot\\s+([A-Z][a-z]{2})\\s+(\\d{1,2})\\s+(\\d{2}:\\d{2})", output)
    if not match:
        return dt.datetime.now().astimezone()

    parsed = dt.datetime.strptime(
        f"{dt.datetime.now().year} {match.group(1)} {match.group(2)} {match.group(3)}",
        "%Y %b %d %H:%M",
    )
    return parsed.replace(tzinfo=timezone)


def parse_pmset_events():
    output = run("pmset -g log")
    events = []
    pattern = re.compile(r"^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} [+-]\\d{4})\\s+(Sleep|Wake|DarkWake)\\b")

    for line in output.splitlines():
        match = pattern.match(line)
        if not match:
            continue

        timestamp = dt.datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S %z")
        kind = match.group(2)

        if kind == "Sleep" and "Entering Sleep" in line:
            events.append((timestamp, "sleep"))
        elif kind == "Wake":
            events.append((timestamp, "wake"))

    events.sort(key=lambda item: item[0])
    return events


def calculate_awake_time(now, day_start, events):
    sleep_started_at = None
    sleeping_at_day_start = False
    slept_ms = 0

    for timestamp, kind in events:
        if timestamp < day_start:
            if kind == "sleep":
                sleep_started_at = timestamp
            elif kind == "wake":
                sleep_started_at = None
            continue

        if kind == "sleep" and sleep_started_at is None:
            sleep_started_at = timestamp
            if timestamp == day_start:
                sleeping_at_day_start = True
        elif kind == "wake" and sleep_started_at is not None:
            overlap_start = max(sleep_started_at, day_start)
            overlap_end = min(timestamp, now)
            if overlap_end > overlap_start:
                slept_ms += int((overlap_end - overlap_start).total_seconds() * 1000)
            sleep_started_at = None

    if sleep_started_at is not None and now > sleep_started_at:
        overlap_start = max(sleep_started_at, day_start)
        slept_ms += int((now - overlap_start).total_seconds() * 1000)

    total_window_ms = max(0, int((now - day_start).total_seconds() * 1000))
    awake_ms = max(0, total_window_ms - slept_ms)
    is_awake_now = sleep_started_at is None

    return awake_ms, slept_ms, is_awake_now, sleeping_at_day_start


def fmt_hm(total_ms):
    total_minutes = max(0, total_ms // 60000)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"


def fmt_short(total_ms):
    total_minutes = max(0, total_ms // 60000)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours} ч {minutes:02d} мин"


now = dt.datetime.now().astimezone()
midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
boot_time = parse_boot_time()
day_start = max(midnight, boot_time)
events = parse_pmset_events()
awake_ms, slept_ms, is_awake_now, _sleeping_at_day_start = calculate_awake_time(now, day_start, events)

weekday_names = {
    0: "Понедельник",
    1: "Вторник",
    2: "Среда",
    3: "Четверг",
    4: "Пятница",
    5: "Суббота",
    6: "Воскресенье",
}

payload = {
    "awakeMs": awake_ms,
    "sleepMs": slept_ms,
    "isAwakeNow": is_awake_now,
    "awakeLabel": fmt_hm(awake_ms),
    "sleepLabel": fmt_short(slept_ms),
    "startLabel": day_start.strftime("%H:%M"),
    "dateLabel": f"{weekday_names[now.weekday()]} {now.day}",
    "seconds": now.strftime("%S"),
    "updatedAt": now.strftime("%H:%M"),
}

print(json.dumps(payload, ensure_ascii=False))
PY
'`;

export const className = `
  top: 0;
  left: 0;
  z-index: 9999;
  width: 0;
  height: 0;
  pointer-events: none;
  font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 300;
  color: #f5f5f5;
`;

const shellStyle = {
  width: "400px",
  padding: "14px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.96)",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "0 16px 30px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.07)",
  pointerEvents: "auto",
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  cursor: "grab",
  userSelect: "none",
};

const eyebrowStyle = {
  fontSize: "13px",
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.92)",
};

const titleStyle = {
  marginTop: "4px",
  fontSize: "14px",
  lineHeight: 1.1,
  fontWeight: 300,
  letterSpacing: "0.02em",
  color: "rgba(255,255,255,0.82)",
};

const statusWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const statusDotStyle = (isAwakeNow) => ({
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: isAwakeNow ? "#32d74b" : "#6e6e73",
  boxShadow: isAwakeNow
    ? "0 0 10px rgba(50,215,75,0.45)"
    : "none",
});

const statusLabelStyle = {
  fontSize: "12px",
  fontWeight: 300,
  color: "rgba(255,255,255,0.76)",
};

const mainModuleStyle = {
  marginTop: "8px",
  padding: "0",
  background: "transparent",
  border: "none",
};

const metricRowStyle = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "8px",
};

const clockStyle = {
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "62px",
  lineHeight: 0.88,
  fontWeight: 300,
  letterSpacing: "-0.08em",
  color: "#ffffff",
};

const secondsStyle = {
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: 300,
  letterSpacing: "-0.03em",
  color: "rgba(255,255,255,0.92)",
};

const summaryStyle = {
  marginTop: "10px",
  marginBottom: "10px",
  fontSize: "13px",
  letterSpacing: "0.01em",
  color: "rgba(255,255,255,0.92)",
};

const progressWrapStyle = {
  marginTop: "2px",
  padding: "13px 13px 12px",
  borderRadius: "9px",
  background: "#ff5a00",
};

const progressMetaStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.8)",
};

const progressTrackStyle = {
  height: "10px",
  borderRadius: "999px",
  background: "rgba(0,0,0,0.24)",
  overflow: "hidden",
};

const progressFillStyle = (progress) => ({
  width: `${Math.max(6, progress * 100)}%`,
  minWidth: "10px",
  height: "100%",
  borderRadius: "999px",
  background: "#000000",
  transition: "width 300ms ease",
});

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "7px",
  marginTop: "10px",
};

const statCardStyle = {
  padding: "11px 11px 10px",
  borderRadius: "8px",
  background: "#0b0b0b",
  border: "1px solid rgba(255,255,255,0.22)",
};

const statLabelStyle = {
  marginBottom: "3px",
  fontSize: "11px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.7)",
};

const statValueStyle = {
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "22px",
  lineHeight: 1.1,
  fontWeight: 300,
  letterSpacing: "-0.05em",
  color: "#ffffff",
};

const statMetaStyle = {
  marginTop: "2px",
  fontSize: "11px",
  color: "rgba(255,255,255,0.58)",
};

const footerStyle = {
  marginTop: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "11px",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.64)",
};

const targetInputWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "2px",
};

const targetInputStyle = {
  width: "72px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.22)",
  background: "#050505",
  color: "#ffffff",
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "18px",
  fontWeight: 300,
  outline: "none",
};

const targetUnitStyle = {
  fontSize: "13px",
  color: "rgba(255,255,255,0.76)",
};

const formatHoursLabel = (totalMs) => {
  const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ч ${String(minutes).padStart(2, "0")} мин`;
};

const clampTargetHours = (value) => {
  const nextValue = Number.parseFloat(value);

  if (!Number.isFinite(nextValue)) {
    return TARGET_HOURS;
  }

  return Math.min(24, Math.max(1, Math.round(nextValue * 2) / 2));
};

const loadSettings = () => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
};

const saveSettings = (settings) => {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_error) {
    // Ignore storage failures and keep widget interactive.
  }
};

const getUiScale = () => {
  if (typeof window === "undefined" || !window.screen) {
    return 1;
  }

  return window.screen.width >= 2560 ? 1.18 : 1;
};

const getDefaultPosition = (scale) => {
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  return {
    x: Math.max(16, viewportWidth - 400 * scale - 24),
    y: 18,
  };
};

const clampPosition = (position, scale) => {
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const maxX = Math.max(16, viewportWidth - 400 * scale - 16);
  const maxY = Math.max(16, viewportHeight - 240 * scale - 16);

  return {
    x: Math.min(maxX, Math.max(16, position.x)),
    y: Math.min(maxY, Math.max(16, position.y)),
  };
};

const scaleWrapStyle = (position, scale) => ({
  position: "fixed",
  left: `${position.x}px`,
  top: `${position.y}px`,
  width: "400px",
  transform: `scale(${scale})`,
  transformOrigin: "top left",
  pointerEvents: "auto",
});

const parseOutput = (output) => {
  try {
    return JSON.parse(output);
  } catch (_error) {
    return null;
  }
};

export const initialState = {
  output: "",
  error: null,
  targetHours: TARGET_HOURS,
  position: null,
  drag: null,
};

export const init = (dispatch) => {
  window.__workTimerDispatch = dispatch;
  dispatch({ type: "HYDRATE_SETTINGS", settings: loadSettings() });
};

export const destroy = () => {
  delete window.__workTimerDispatch;
};

export const updateState = (event, previousState) => {
  switch (event.type) {
    case "HYDRATE_SETTINGS": {
      const scale = getUiScale();
      return {
        ...previousState,
        targetHours: clampTargetHours(event.settings?.targetHours ?? previousState.targetHours),
        position: event.settings?.position
          ? clampPosition(event.settings.position, scale)
          : getDefaultPosition(scale),
      };
    }
    case "SET_TARGET":
      return {
        ...previousState,
        targetHours: clampTargetHours(event.targetHours),
      };
    case "DRAG_START":
      return {
        ...previousState,
        drag: {
          pointerId: event.pointerId,
          offsetX: event.clientX - event.position.x,
          offsetY: event.clientY - event.position.y,
        },
      };
    case "DRAG_MOVE": {
      if (!previousState.drag || previousState.drag.pointerId !== event.pointerId) {
        return previousState;
      }

      return {
        ...previousState,
        position: clampPosition(
          {
            x: event.clientX - previousState.drag.offsetX,
            y: event.clientY - previousState.drag.offsetY,
          },
          getUiScale()
        ),
      };
    }
    case "DRAG_END":
      return {
        ...previousState,
        drag: null,
      };
    default:
      return {
        ...previousState,
        output: event.output ?? previousState.output,
        error: event.error ?? null,
      };
  }
};

const startDragging = (event, dispatch, position) => {
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  dispatch({
    type: "DRAG_START",
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    position,
  });
};

const moveDragging = (event, dispatch, drag) => {
  if (!drag) {
    return;
  }

  dispatch({
    type: "DRAG_MOVE",
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
  });
};

const endDragging = (event, dispatch, state, position) => {
  if (!state.drag) {
    return;
  }

  event.currentTarget.releasePointerCapture?.(event.pointerId);
  const finalPosition = clampPosition(
    {
      x: event.clientX - state.drag.offsetX,
      y: event.clientY - state.drag.offsetY,
    },
    getUiScale()
  );
  dispatch({
    type: "DRAG_MOVE",
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
  });
  saveSettings({
    targetHours: state.targetHours,
    position: finalPosition,
  });
  dispatch({ type: "DRAG_END" });
};

const setTargetHours = (dispatch, state, value) => {
  const nextTarget = clampTargetHours(value);
  saveSettings({
    targetHours: nextTarget,
    position: state.position || getDefaultPosition(getUiScale()),
  });
  dispatch({ type: "SET_TARGET", targetHours: nextTarget });
};

export const render = (state) => {
  const { output, error } = state;
  const scale = getUiScale();
  const position = state.position || getDefaultPosition(scale);
  const dispatch = window.__workTimerDispatch;

  if (error) {
    return (
      <div style={scaleWrapStyle(position, scale)}>
        <div style={shellStyle}>
          <div style={titleStyle}>Трекер времени</div>
          <div style={{ ...statValueStyle, marginTop: "12px", color: "#ff8f8f" }}>
            Ошибка чтения системы
          </div>
        </div>
      </div>
    );
  }

  const data = parseOutput(output);

  if (!data) {
    return (
      <div style={scaleWrapStyle(position, scale)}>
        <div style={shellStyle}>
          <div style={titleStyle}>Трекер времени</div>
          <div style={{ ...statValueStyle, marginTop: "12px" }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  const progressText =
    data.awakeMs >= state.targetHours * 60 * 60 * 1000
      ? `сверх цели +${formatHoursLabel(data.awakeMs - state.targetHours * 60 * 60 * 1000)}`
      : `до цели ${formatHoursLabel(Math.max(0, state.targetHours * 60 * 60 * 1000 - data.awakeMs))}`;
  const progress = Math.min(1, data.awakeMs / (state.targetHours * 60 * 60 * 1000));

  return (
    <div style={scaleWrapStyle(position, scale)}>
      <div style={shellStyle}>
        <div
          style={headerRowStyle}
          onPointerDown={(event) => startDragging(event, dispatch, position)}
          onPointerMove={(event) => moveDragging(event, dispatch, state.drag)}
          onPointerUp={(event) => endDragging(event, dispatch, state, position)}
          onPointerCancel={(event) => endDragging(event, dispatch, state, position)}
        >
          <div>
            <div style={eyebrowStyle}>{data.dateLabel}</div>
            <div style={titleStyle}>Экранное время</div>
          </div>
          <div style={statusWrapStyle}>
            <span style={statusDotStyle(data.isAwakeNow)} />
            <span style={statusLabelStyle}>{data.isAwakeNow ? "Активен" : "Сон"}</span>
          </div>
        </div>

        <div style={mainModuleStyle}>
          <div style={metricRowStyle}>
            <div>
              <div style={clockStyle}>{data.awakeLabel}</div>
            </div>
            <div style={secondsStyle}>{data.seconds}</div>
          </div>

          <div style={summaryStyle}>{progressText}</div>

          <div style={progressWrapStyle}>
            <div style={progressMetaStyle}>
              <span>Ход дня</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div style={progressTrackStyle}>
              <div style={progressFillStyle(progress)} />
            </div>
          </div>
        </div>

        <div style={infoGridStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Цель</div>
            <div style={targetInputWrapStyle}>
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={state.targetHours}
                style={targetInputStyle}
                onChange={(event) => setTargetHours(dispatch, state, event.target.value)}
              />
              <span style={targetUnitStyle}>часов</span>
            </div>
            <div style={statMetaStyle}>задать самому</div>
          </div>

          <div style={statCardStyle}>
            <div style={statLabelStyle}>Сон и старт</div>
            <div style={statValueStyle}>{data.sleepLabel}</div>
            <div style={statMetaStyle}>старт: {data.startLabel}</div>
          </div>
        </div>

        <div style={footerStyle}>
          <span>Обновлено {data.updatedAt}</span>
          <span>Sleep / Wake</span>
        </div>
      </div>
    </div>
  );
};
