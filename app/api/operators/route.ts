import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/firebase-admin'
import {
  Query,
  FieldPath,
  DocumentData,
} from 'firebase-admin/firestore'
import { can } from '@/lib/api/permissions'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1]

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)

    const user = {
      id: decoded.uid,
      role: decoded.role,
      authorityId: decoded.authorityId,
      operatorId: decoded.operatorId,
    }

    const allowed = await can(user, 'operator', 'read')

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query: Query<DocumentData> = adminDb.collection('operators')

    if (user.role === 'AUTHORITY') {
      query = query.where('authorityId', '==', user.authorityId)
    }

    if (user.role === 'OPERATOR') {
      query = query.where(FieldPath.documentId(), '==', user.operatorId)
    }

    const snap = await query.get()

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}