import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { CardNewsData } from '../types';

export interface Template {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  pricePoints: number;
  jsonData: string;
  downloads: number;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'creator' | 'admin';
  points: number;
  createdAt: any;
}

// Fetch all templates
export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
};

// Share a template to the marketplace
export const shareTemplate = async (
  title: string,
  description: string,
  pricePoints: number,
  cardData: CardNewsData
): Promise<string> => {
  if (!auth.currentUser) throw new Error("로그인이 필요합니다.");

  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data() as UserProfile;
    
    if (!userData || (userData.role !== 'creator' && userData.role !== 'admin')) {
      throw new Error("크리에이터 권한이 필요합니다.");
    }

    const templateData = {
      authorId: auth.currentUser.uid,
      authorName: userData.displayName || auth.currentUser.displayName || '익명',
      title,
      description,
      pricePoints,
      jsonData: JSON.stringify(cardData),
      downloads: 0,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'templates'), templateData);
    
    // Update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });
    
    return docRef.id;
  } catch (error) {
    console.error("Error sharing template:", error);
    throw error;
  }
};

// Increment downloads and handle points transaction
export const downloadTemplate = async (templateId: string, templatePrice: number, authorId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error("로그인이 필요합니다.");
  
  try {
    const templateRef = doc(db, 'templates', templateId);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const authorRef = doc(db, 'users', authorId);

    await runTransaction(db, async (transaction) => {
      const templateDoc = await transaction.get(templateRef);
      if (!templateDoc.exists()) {
        throw new Error("템플릿을 찾을 수 없습니다.");
      }

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      const userData = userDoc.data() as UserProfile;
      
      // Check if user is the author
      if (auth.currentUser?.uid === authorId) {
        // Author downloading their own template, just increment download count
        const newDownloads = (templateDoc.data().downloads || 0) + 1;
        transaction.update(templateRef, { downloads: newDownloads });
        return;
      }

      if (templatePrice > 0) {
        if (userData.points < templatePrice) {
          throw new Error(`포인트가 부족합니다. (필요: ${templatePrice}P, 현재: ${userData.points}P)`);
        }

        const authorDoc = await transaction.get(authorRef);
        if (!authorDoc.exists()) {
          throw new Error("작성자 정보를 찾을 수 없습니다.");
        }

        // Deduct points from user
        transaction.update(userRef, { points: userData.points - templatePrice });
        
        // Add points to author
        const authorData = authorDoc.data() as UserProfile;
        transaction.update(authorRef, { points: authorData.points + templatePrice });
      }

      // Increment template downloads
      const newDownloads = (templateDoc.data().downloads || 0) + 1;
      transaction.update(templateRef, { downloads: newDownloads });
    });
  } catch (error) {
    console.error("Error downloading template:", error);
    throw error;
  }
};

// Ensure user profile exists
export const ensureUserProfile = async (user: any): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  } else {
    const newUser: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '익명',
      photoURL: user.photoURL || '',
      role: 'user', // Default role
      points: 0,
      createdAt: serverTimestamp()
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
};

// Charge points (for testing purposes)
export const chargePoints = async (amount: number): Promise<void> => {
  if (!auth.currentUser) throw new Error("로그인이 필요합니다.");
  
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }
      const userData = userDoc.data() as UserProfile;
      transaction.update(userRef, { points: (userData.points || 0) + amount });
    });
  } catch (error) {
    console.error("Error charging points:", error);
    throw error;
  }
};
