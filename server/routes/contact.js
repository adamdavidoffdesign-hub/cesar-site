const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { getDb } = require('../db');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mail.ru',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach(r => {
      settings[r.key] = r.value;
    });

    const recipient = settings.form_recipient || process.env.SMTP_USER;
    const subject = settings.form_subject || 'Заявка с сайта Cesar Studio';

    const { name, phone, email, message, collection } = req.body;

    if (!name && !phone && !email) {
      return res.status(400).json({ ok: false, error: 'Заполните обязательные поля' });
    }

    const lines = ['Новая заявка с сайта Cesar Studio', '─────────────────────────'];
    if (name)       lines.push(`Имя: ${name}`);
    if (phone)      lines.push(`Телефон: ${phone}`);
    if (email)      lines.push(`Email: ${email}`);
    if (collection) lines.push(`Коллекция: ${collection}`);
    if (message)    lines.push(`Сообщение:\n${message}`);
    lines.push('─────────────────────────');
    lines.push(`Источник: ${req.headers.referer || 'cesar-studio.ru'}`);

    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Cesar Studio" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: subject,
      text: lines.join('\n'),
      html: lines.join('<br>')
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ ok: false, error: 'Ошибка отправки. Позвоните нам напрямую.' });
  }
});

module.exports = router;
