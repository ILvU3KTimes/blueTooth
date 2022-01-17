const getBaseUrl = (url) => {
  let BASE_URL = '';
  if (process.env.NODE_ENV === 'development') {
    //开发环境 - 根据请求不同返回不同的BASE_URL
    BASE_URL='http://192.168.139.183:3000/'
  } else {
    BASE_URL='http://192.168.139.183:3000/'
  }
  return BASE_URL
}

export default getBaseUrl;
