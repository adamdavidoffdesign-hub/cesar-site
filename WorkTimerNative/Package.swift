// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WorkTimerNative",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "WorkTimerNative", targets: ["WorkTimerNative"])
    ],
    targets: [
        .executableTarget(
            name: "WorkTimerNative",
            path: "Sources/WorkTimerNative"
        )
    ]
)
