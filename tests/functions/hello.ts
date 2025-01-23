import * as jwt from 'jsonwebtoken'

import { cloud } from '../../src/index'
import type { FunctionContext } from '../../src/types/functions'

export default async function (ctx: FunctionContext) {
  console.log(12313123, ctx.user)

  const jwtdata = cloud.getToken({
    user: '1',
    expiresIn: 1000,
  })

  console.log(jwtdata)

  console.log(jwt.verify(jwtdata, '111'))

  const db = cloud.database()
  const res = await db.collection('test').get()

  console.log(res)
  // const cache = FunctionCache.getAll()
  // console.log(cache)
  return {
    data: 'hello',
  }
}
