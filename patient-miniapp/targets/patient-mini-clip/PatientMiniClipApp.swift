import SwiftUI

@main
struct PatientMiniClipApp: App {
    @State private var invocationURL: URL?

    var body: some Scene {
        WindowGroup {
            PatientCardClipView(invocationURL: invocationURL)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    invocationURL = activity.webpageURL
                }
                .onOpenURL { url in
                    invocationURL = url
                }
        }
    }
}
