import Foundation

struct PatientCardPayload: Decodable {
    let expiresAt: String
    let patient: Patient
    let clinic: Clinic
    let hotel: Hotel
    let transport: Transport
    let itinerary: [ItineraryEvent]
    let sources: [String]

    struct Patient: Decodable {
        let firstName: String
        let displayName: String
        let destinationCity: String
        let destinationCountry: String
    }

    struct Clinic: Decodable {
        let name: String
        let address: String?
        let phone: String?
    }

    struct Hotel: Decodable {
        let name: String
        let address: String?
        let confirmationNumber: String?
    }

    struct Transport: Decodable {
        let driverName: String?
        let driverPhone: String?
        let nextPickupTitle: String?
        let nextPickupAt: String?
        let nextPickupLocation: String?
    }

    struct ItineraryEvent: Decodable, Identifiable {
        let id: String
        let title: String
        let kind: String
        let location: String?
        let startsAt: String?
        let confirmationNumber: String?
    }
}
