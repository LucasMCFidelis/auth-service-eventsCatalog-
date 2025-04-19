export function resolveServiceUrl(serviceName: string) {
  const environment = process.env.NODE_ENV || "development";
  const suffix = environment === "production" ? "PROD" : "DEV";
  return process.env[`${serviceName}_SERVICE_URL_${suffix}`];
}