import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing Firebase Admin environment variables');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, operatorId, displayName } = await req.json();

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'operator_admin',
      operatorId,
    });

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
      email,
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create operator admin' },
      { status: 500 }
    );
  }
}
