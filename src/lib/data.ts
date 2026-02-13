
export type UserProfile = {
  requiresPasswordChange: boolean;
  role: 'admin' | 'user';
};

export type Student = {
    studentId: string;
    studentName: string;
    class: string;
    parentName: string;
    parentPhone: string;
    status?: 'Active' | 'Graduated';
  };
  
  export type Book = {
    bookId: string;
    bookTitle: string;
    class: string;
    price: number;
  };
  
  export type AcademicYear = {
    academicYearId: string;
    year: string;
  };
  
  export type Payment = {
    paymentId: string;
    date: Date;
    studentId: string;
    bookId: string;
    academicYearId: string;
    amountPaid: number;
    method: 'Cash' | 'Mobile Money' | 'Bank Transfer';
  };
  
  export type Balance = {
    studentId: string;
    studentName: string;
    class: string;
    bookId: string;
    bookTitle: string;
    academicYearId: string;
    bookPrice: number;
    totalPaid: number;
    balance: number;
    status: 'Paid' | 'Partial' | 'Unpaid';
  };

  export interface StudentFinancialProfile {
    studentId: string;
    studentName: string;
    class: string;
    totalBalance: number;
    books: {
      bookId: string;
      bookTitle: string;
      bookPrice: number;
      totalPaid: number; // in selected year
      balance: number; // final balance
      status: 'Paid' | 'Partial' | 'Unpaid';
    }[];
  }
  
  export const students: Student[] = [];
  
  export const books: Book[] = [];
  
  export const payments: Payment[] = [];

