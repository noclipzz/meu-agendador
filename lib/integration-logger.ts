import { db } from "./db";

type IntegrationService = "CORA" | "EVOLUTION" | "SIGCORP" | "RESEND" | "CLERK" | "SYSTEM";
type IntegrationType = "WEBHOOK" | "API_REQUEST" | "CRON" | "NOTIFICATION";
type IntegrationStatus = "SUCCESS" | "ERROR" | "WARNING";

export async function logIntegration({
    companyId,
    service,
    type,
    status,
    endpoint,
    identifier,
    payload,
    response,
    errorMessage,
}: {
    companyId?: string;
    service: IntegrationService;
    type: IntegrationType;
    status: IntegrationStatus;
    endpoint?: string;
    identifier?: string;
    payload?: any;
    response?: any;
    errorMessage?: string;
}) {
    try {
        await db.integrationLog.create({
            data: {
                companyId,
                service,
                type,
                status,
                endpoint,
                identifier: identifier?.substring(0, 255), // Avoid overly long identifiers
                payload: payload ? JSON.parse(JSON.stringify(payload)) : null, // Clean serialization
                response: response ? JSON.parse(JSON.stringify(response)) : null,
                errorMessage,
            },
        });
    } catch (err) {
        // We don't want the logger itself to crash our main application logic.
        console.error("❌ [LOGGER FATAL ERROR] Failed to save integration log in DB.", err);
    }
}
