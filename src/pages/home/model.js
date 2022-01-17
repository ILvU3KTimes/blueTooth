import Taro from '@tarojs/taro'
import { getUser } from './servers'
export default {
  namespace: 'index',
  state: {
    user: []
  },
  effects: {
    *fetchUser({ payload }, { call, put }) {
      const respones = yield call(getUser, payload);
      if (respones.code == 0) {
        yield put({
          type: 'saveData',
          payload: respones.data
        });
      }
    }
  },
  reducers: {
    saveData(state, action) {
      return {
        ...state,
        user: action.payload,
      };
    },
  }
}