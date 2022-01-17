/* eslint-disable import/prefer-default-export */
import HTTPREQUEST from "./http"

export const reducers= {
  save(state, { payload }) {
    return {
      ...state,
      ...payload,
    };
  },
  update(state, { payload }) {
    const { name, value } = payload;
    return {
      ...state,
      ...{
        [name]: Array.isArray(state[name])
          ? [...state[name], ...value]
          : { ...state[name], ...value },
      },
    };
  },
};

export const userLoginCode = (data) => {
  return HTTPREQUEST.post('comapi/users/logincode', data)
}
