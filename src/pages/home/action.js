export const INDEX_NAMESPACE = 'index';
export function GET_USER(payload) {
  return {
    type: `${INDEX_NAMESPACE}/fetchUser`,
    payload,
  };
}