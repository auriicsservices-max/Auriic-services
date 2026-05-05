// The applet structure has src/services.
// Let's create a service to save this.

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export const saveTrainingCV = async (cvData: any, userId: string) => {
  try {
    const docRef = await addDoc(collection(db, "training_cvs"), {
      ...cvData,
      uploadedBy: userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};
