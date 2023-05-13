import { baseUrl as baseURL } from './url'
/**
 * Get request
 *
 * @param {*} url
 * @param {*} params
 */

export function get (url, params) {
  // 请求参数处理
  const param = params && { ...params }
  if (param) {
    const paramsArray = []
    Object.keys(param).forEach((key) =>
      paramsArray.push(key + '=' + param[key])
    )
    if (url.search(/\?/) === -1) {
      url += '?' + paramsArray.join('&')
    } else {
      url += '&' + paramsArray.join('&')
    }
  }
  return new Promise(function(resolve, reject) {
    fetch(`${baseURL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((responseJson) => {
        resolve(responseJson)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/**
 * POST
 *
 * @param {*} url
 * @param {*} params
 */
export function post (url, params) {
  const reqParams = JSON.stringify(params)
  return new Promise((resolve, reject) => {
    fetch(`${baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: reqParams
    })
      .then((response) => response.json())
      .then((responseJson) => {
        resolve(responseJson)
      })
      .catch(function(err) {
        reject(err)
      })
  })
}

/**
 * PUT
 *
 * @param {*} url
 * @param {*} params
 */
export function put (url, params) {
  const reqParams = JSON.stringify(params)
  const param = params && { ...params }
  if (param) {
    const paramsArray = []
    Object.keys(param).forEach((key) =>
      paramsArray.push(key + '=' + param[key])
    )
    if (url.search(/\?/) === -1) {
      url += '?' + paramsArray.join('&')
    } else {
      url += '&' + paramsArray.join('&')
    }
  }
  return new Promise((resolve, reject) => {
    fetch(`${baseURL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: reqParams
    })
      .then((response) => response.json())
      .then((responseJson) => {
        resolve(responseJson)
      })
      .catch(function(err) {
        reject(err)
      })
  })
}
