// ### 3. `app/api/operators/create-admin/route.ts`


import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, operatorId, displayName } = await req.json();

    // 1. Create Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // 2. Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'operator_admin',
      operatorId,
    });

    // 3. Create Firestore /users/{uid} doc
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      displayName,
      role: 'operator_admin',
      operatorId,
      municipalityId: 'CUA',
      district: 'DIS04',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      uid: userRecord.uid,
      email 
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create operator admin' },
      { status: 500 }
    );
  }
}