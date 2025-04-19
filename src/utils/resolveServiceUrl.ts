export function resolveServiceUrl(serviceName: string) {
  const environment = process.env.NODE_ENV || "development";
  const suffix = environment === "production" ? "PROD" : "DEV";
  const url = process.env[`${serviceName}_SERVICE_URL_${suffix}`];
  
  if (!url) {
    console.error(`${serviceName}_SERVICE_URL_${suffix} não está definida nas variáveis ambiente`)
  }
  
  return url
}
