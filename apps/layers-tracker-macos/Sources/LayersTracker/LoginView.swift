import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var store: TrackerStore
    @State private var email = ""
    @State private var password = ""
    @State private var showServer = false
    @FocusState private var focusedField: Field?

    private enum Field {
        case email
        case password
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.layersCoral)
                    Image(systemName: "timer")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .frame(width: 44, height: 44)

                Text("Layers Tracker")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                Text("Jednoduché meranie času priamo z menu baru.")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 12) {
                TextField("E-mail", text: $email)
                    .focused($focusedField, equals: .email)
                    .onSubmit { focusedField = .password }

                SecureField("Heslo", text: $password)
                    .focused($focusedField, equals: .password)
                    .onSubmit { submit() }

                DisclosureGroup("Nastavenie servera", isExpanded: $showServer) {
                    TextField("https://app.layers.studio", text: $store.serverURL)
                        .textFieldStyle(.roundedBorder)
                        .padding(.top, 8)
                    Text("Lokálne použite http://localhost:3001")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
            }
            .textFieldStyle(.roundedBorder)

            if let errorMessage = store.errorMessage {
                ErrorBanner(message: errorMessage)
            }

            Button(action: submit) {
                HStack(spacing: 8) {
                    if store.isLoading {
                        ProgressView()
                            .controlSize(.small)
                    }
                    Text(store.isLoading ? "Prihlasujem…" : "Prihlásiť sa")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(LayersPrimaryButtonStyle())
            .disabled(email.isEmpty || password.isEmpty || store.isLoading)

            Spacer(minLength: 0)

            HStack {
                Text("Layers Studio")
                    .foregroundStyle(.tertiary)
                Spacer()
                Button("Ukončiť") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            }
            .font(.system(size: 11))
        }
        .padding(24)
        .onAppear { focusedField = .email }
    }

    private func submit() {
        guard !email.isEmpty, !password.isEmpty, !store.isLoading else { return }
        Task { await store.login(email: email, password: password) }
    }
}
