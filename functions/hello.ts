import { cloud } from '../src/index'

export default async function (ctx: FunctionContext) {
  console.log('UserInfo', ctx.user)

  const jwtdata = cloud.getToken({
    user: '1',
    expiresIn: 1000,
  })

  console.log(jwtdata)

  console.log(cloud.parseToken(jwtdata))

  const db = cloud.database()
  const res = await db.collection('test').get()
  console.log(1111, res)

  const db2 = cloud.mongo.db
  const res2 = await db2.collection('test').find().toArray()
  console.log(222, res2)

  const res3 = await cloud.invoke('__init__')
  console.log(333, res2)

  // const cache = FunctionCache.getAll()
  // console.log(cache)
  return {
    data: 'hello',
  }
}
