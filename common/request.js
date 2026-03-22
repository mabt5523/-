// /common/request.js
const BASE_URL = 'http://81.70.62.177:8080'
//const BASE_URL = 'http://localhost:8080'


// 你可以把真实 userId 存到本地：uni.setStorageSync('USER_ID', '123')
// 现在没登录时，先用 '1' 保证后端 Long 不报错（不要用 guest）
function getUserId() {
  const uid = uni.getStorageSync('USER_ID') || uni.getStorageSync('userId')
  const s = String(uid || '').trim()
  return /^\d+$/.test(s) ? s : '1'
}

// 把 params 拼到 url（uni.request 不支持 params 字段）
function withQuery(url, params) {
  if (!params || typeof params !== 'object') return url
  const qs = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  if (!qs) return url
  return url + (url.includes('?') ? '&' : '?') + qs
}

function request(options = {}) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const url = BASE_URL + withQuery(options.url || '', options.params)

    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}) // ✅ 允许页面级别覆盖/补充
      },
      success: (res) => {
        const data = res.data

        // ===== 兼容后端统一格式：{ code, msg/message, data? } =====
        // ✅ 统一格式：{ code, msg, data }
        if (data && typeof data === 'object' && data.code !== undefined) {
          if (data.code === 200 || data.code === 0) {
            resolve(data)        // ✅ 返回整个对象：{code,msg,data}
          } else {
            uni.showToast({
              title: data.message || data.msg || '请求失败',
              icon: 'none'
            })
            reject(new Error(data.message || data.msg || '请求失败'))
          }
          return
        }
        
        // ✅ 兼容：后端直接返回数组/对象
        resolve(data)


      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 如果别的地方要用
export { getUserId, withQuery }
export default request 