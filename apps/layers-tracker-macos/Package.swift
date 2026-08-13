// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "LayersTracker",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "LayersTracker", targets: ["LayersTracker"])
    ],
    targets: [
        .executableTarget(
            name: "LayersTracker",
            path: "Sources/LayersTracker"
        )
    ]
)
