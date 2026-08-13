import Foundation

enum TrackerAPIError: LocalizedError {
    case invalidServerURL
    case invalidResponse
    case requestFailed(statusCode: Int, message: String)
    case missingData

    var errorDescription: String? {
        switch self {
        case .invalidServerURL:
            return "Adresa servera nie je platná."
        case .invalidResponse:
            return "Server vrátil neplatnú odpoveď."
        case let .requestFailed(_, message):
            return message
        case .missingData:
            return "V odpovedi servera chýbajú dáta."
        }
    }

    var isUnauthorized: Bool {
        if case let .requestFailed(statusCode, _) = self {
            return statusCode == 401
        }
        return false
    }
}

struct APIClient {
    let baseURL: URL

    init(baseURLString: String) throws {
        let normalized = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        guard
            let url = URL(string: normalized),
            let scheme = url.scheme?.lowercased(),
            scheme == "https" || (scheme == "http" && ["localhost", "127.0.0.1"].contains(url.host))
        else {
            throw TrackerAPIError.invalidServerURL
        }

        baseURL = url
    }

    func get<Value: Decodable>(
        _ path: String,
        accessToken: String? = nil,
        queryItems: [URLQueryItem] = []
    ) async throws -> Value {
        var components = URLComponents(url: endpoint(path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems.isEmpty ? nil : queryItems

        guard let url = components?.url else {
            throw TrackerAPIError.invalidServerURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        applyHeaders(to: &request, accessToken: accessToken)
        return try await send(request)
    }

    func getOptional<Value: Decodable>(
        _ path: String,
        accessToken: String,
        queryItems: [URLQueryItem] = []
    ) async throws -> Value? {
        var components = URLComponents(url: endpoint(path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems.isEmpty ? nil : queryItems

        guard let url = components?.url else {
            throw TrackerAPIError.invalidServerURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        applyHeaders(to: &request, accessToken: accessToken)
        return try await sendOptional(request)
    }

    func post<Body: Encodable, Value: Decodable>(
        _ path: String,
        body: Body,
        accessToken: String? = nil
    ) async throws -> Value {
        var request = URLRequest(url: endpoint(path))
        request.httpMethod = "POST"
        request.httpBody = try JSONEncoder.layers.encode(body)
        applyHeaders(to: &request, accessToken: accessToken)
        return try await send(request)
    }

    func post<Value: Decodable>(
        _ path: String,
        accessToken: String
    ) async throws -> Value {
        var request = URLRequest(url: endpoint(path))
        request.httpMethod = "POST"
        applyHeaders(to: &request, accessToken: accessToken)
        return try await send(request)
    }

    private func endpoint(_ path: String) -> URL {
        baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }

    private func applyHeaders(to request: inout URLRequest, accessToken: String?) {
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("LayersTracker/macOS", forHTTPHeaderField: "X-Layers-Client")

        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
    }

    private func send<Value: Decodable>(_ request: URLRequest) async throws -> Value {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw TrackerAPIError.invalidResponse
        }

        let decoder = JSONDecoder.layers
        let envelope = try? decoder.decode(APIEnvelope<Value>.self, from: data)

        guard (200..<300).contains(httpResponse.statusCode), envelope?.success == true else {
            let message = envelope?.error ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            throw TrackerAPIError.requestFailed(statusCode: httpResponse.statusCode, message: message)
        }

        guard let value = envelope?.data else {
            throw TrackerAPIError.missingData
        }

        return value
    }

    private func sendOptional<Value: Decodable>(_ request: URLRequest) async throws -> Value? {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw TrackerAPIError.invalidResponse
        }

        let envelope = try JSONDecoder.layers.decode(APIEnvelope<Value>.self, from: data)

        guard (200..<300).contains(httpResponse.statusCode), envelope.success else {
            let message = envelope.error ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            throw TrackerAPIError.requestFailed(statusCode: httpResponse.statusCode, message: message)
        }

        return envelope.data
    }
}

extension JSONDecoder {
    static var layers: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}

extension JSONEncoder {
    static var layers: JSONEncoder {
        JSONEncoder()
    }
}
