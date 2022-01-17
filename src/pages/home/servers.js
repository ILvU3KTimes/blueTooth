import HTTPREQUEST from "@/servers/http"

export async function getUser(params) {
  return HTTPREQUEST.get('sqlapi/getDrawUser', params);
}
