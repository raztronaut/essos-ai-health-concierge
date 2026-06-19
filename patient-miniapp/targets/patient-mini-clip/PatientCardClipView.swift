import SwiftUI

struct PatientCardClipView: View {
    let invocationURL: URL?
    @State private var payload: PatientCardPayload?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if let payload {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            header(payload)
                            section("Clinic", title: payload.clinic.name) {
                                row("Address", payload.clinic.address)
                                row("Phone", payload.clinic.phone)
                            }
                            section("Hotel", title: payload.hotel.name) {
                                row("Address", payload.hotel.address)
                                row("Confirmation", payload.hotel.confirmationNumber)
                            }
                            section("Transport", title: payload.transport.nextPickupTitle ?? "Pickup") {
                                row("Driver", payload.transport.driverName)
                                row("Phone", payload.transport.driverPhone)
                                row("Location", payload.transport.nextPickupLocation)
                            }
                            section("Itinerary", title: nil) {
                                ForEach(payload.itinerary) { event in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(event.title).font(.headline)
                                        row("Time", event.startsAt)
                                        row("Location", event.location)
                                        row("Code", event.confirmationNumber)
                                    }
                                    .padding(.vertical, 6)
                                }
                            }
                        }
                        .padding()
                    }
                } else if let error {
                    ContentUnavailableView("Card unavailable", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ProgressView("Opening Essos card...")
                }
            }
            .navigationTitle("Trip card")
            .task(id: invocationURL) {
                await load()
            }
        }
    }

    private func header(_ payload: PatientCardPayload) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(payload.patient.firstName)'s trip card")
                .font(.largeTitle.bold())
            Text("\(payload.patient.destinationCity), \(payload.patient.destinationCountry)")
                .foregroundStyle(.secondary)
            Text("Expires \(payload.expiresAt)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func section<Content: View>(_ eyebrow: String, title: String?, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(eyebrow.uppercased())
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            if let title {
                Text(title).font(.title3.bold())
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            HStack(alignment: .firstTextBaseline) {
                Text(label).foregroundStyle(.secondary)
                Spacer(minLength: 12)
                Text(value)
                    .multilineTextAlignment(.trailing)
                    .textSelection(.enabled)
            }
            .font(.subheadline)
        }
    }

    private func load() async {
        guard let token = invocationURL?.lastPathComponent, !token.isEmpty else {
            error = "Open this App Clip from an Essos patient card link."
            return
        }
        let base = ProcessInfo.processInfo.environment["EXPO_PUBLIC_CARD_API_URL"] ?? "https://mini.essos.dev/miniapp/card"
        guard var components = URLComponents(string: base) else {
            error = "The card API URL is not configured."
            return
        }
        components.queryItems = [URLQueryItem(name: "token", value: token)]
        guard let url = components.url else {
            error = "The card link is malformed."
            return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                error = "This card link has expired or is unavailable."
                return
            }
            payload = try JSONDecoder().decode(PatientCardPayload.self, from: data)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
