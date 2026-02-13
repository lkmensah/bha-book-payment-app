
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dashboard } from "@/components/dashboard";
import { StudentPaymentTable } from "@/components/student-payment-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type Student, type Book, type Payment, type AcademicYear, type StudentFinancialProfile } from "@/lib/data";
import { Download, Search, UserPlus, CalendarPlus, CircleDollarSign, Loader2, Users, Printer } from "lucide-react";
import { BookIcon } from "@/components/icons";
import { AddStudentForm } from "@/components/add-student-form";
import { AddPaymentForm } from "@/components/add-payment-form";
import { AddAcademicYearForm } from "@/components/add-term-form";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManageBooksDialog } from "@/components/manage-books-dialog";
import { PaymentHistoryDialog } from "@/components/payment-history-dialog";
import { ReceiptDialog } from "@/components/ui/receipt-dialog";
import { ToastAction } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUserProfile } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, doc, setDoc, deleteDoc, writeBatch, Timestamp, query, orderBy, serverTimestamp, getDocs, where, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ManageStudentsDialog } from "./manage-students-dialog";
import { CLASS_CATEGORIES, CLASS_ORDER } from "@/lib/class-order";

type DialogType = "add-student" | "add-payment" | "add-academic-year";

type ReceiptInfo = {
  student: Student;
  newPaymentsWithBalance: {
    payment: Payment;
    balanceAfterPayment: number;
  }[];
  books: Book[];
  totalAmountPaid: number;
};

export function AppContent() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [openDialog, setOpenDialog] = React.useState<DialogType | null>(null);
  const { toast } = useToast();
  const [outstandingFilter, setOutstandingFilter] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [viewingPayments, setViewingPayments] = React.useState<Student | null>(null);
  const [receiptData, setReceiptData] = React.useState<ReceiptInfo | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = React.useState<string>("");
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, loading: userProfileLoading } = useUserProfile();

  const studentsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "students"), orderBy("studentName")) : null,
    [firestore]
  );
  const { data: students, loading: studentsLoading } = useCollection<Student>(studentsQuery);

  const booksQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "books"), orderBy("bookTitle")) : null,
    [firestore]
  );
  const { data: books, loading: booksLoading } = useCollection<Book>(booksQuery);
  
  const academicYearsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "academicYears"), orderBy("year", "desc")) : null,
    [firestore]
  );
  const { data: academicYears, loading: academicYearsLoading } = useCollection<AcademicYear>(academicYearsQuery);
  
  const paymentsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "payments"), orderBy("date", "desc")) : null,
    [firestore]
  );
  const { data: paymentsData, loading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  React.useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      setSelectedAcademicYearId(academicYears[0].academicYearId);
    }
  }, [academicYears, selectedAcademicYearId]);

  const activeStudents = React.useMemo(() => students.filter(s => s.status !== 'Graduated'), [students]);

  const payments = React.useMemo(() => {
    if (!paymentsData) return [];
    return paymentsData.map(p => ({
        ...p,
        date: (p.date as any)?.toDate ? (p.date as any).toDate() : new Date(),
    }));
  }, [paymentsData]);

  const handleToggleOutstandingFilter = () => {
    setOutstandingFilter(prev => !prev);
  };

  const studentProfiles = React.useMemo((): StudentFinancialProfile[] => {
    if (!activeStudents.length || !books) return [];
    
    return activeStudents.map(student => {
        const booksForStudentClass = books.filter(b => b.class === student.class);

        const bookSummaries = booksForStudentClass.map(book => {
            const paymentsForBook = payments.filter(p => p.studentId === student.studentId && p.bookId === book.bookId);
            const totalPaid = paymentsForBook.reduce((sum, p) => sum + p.amountPaid, 0);
            const balance = book.price - totalPaid;
            
            const paymentsInSelectedYear = paymentsForBook.filter(p => p.academicYearId === selectedAcademicYearId);
            const totalPaidInSelectedYear = paymentsInSelectedYear.reduce((sum, p) => sum + p.amountPaid, 0);

            let status: 'Paid' | 'Partial' | 'Unpaid';
            if (balance <= 0) {
                status = 'Paid';
            } else if (totalPaid > 0) {
                status = 'Partial';
            } else {
                status = 'Unpaid';
            }

            return {
                bookId: book.bookId,
                bookTitle: book.bookTitle,
                bookPrice: book.price,
                totalPaid: totalPaidInSelectedYear,
                balance: balance,
                status: status,
            };
        });

        // Carry forward balances from other classes
        const otherClassBooksWithHistory = books.filter(book => 
            book.class !== student.class && 
            payments.some(p => p.studentId === student.studentId && p.bookId === book.bookId)
        );

        otherClassBooksWithHistory.forEach(book => {
            const totalPaid = payments
                .filter(p => p.studentId === student.studentId && p.bookId === book.bookId)
                .reduce((sum, p) => sum + p.amountPaid, 0);
            
            const balance = book.price - totalPaid;

            if (balance > 0) {
                const paymentsInSelectedYear = payments.filter(p => p.studentId === student.studentId && p.bookId === book.bookId && p.academicYearId === selectedAcademicYearId)
                    .reduce((sum, p) => sum + p.amountPaid, 0);

                bookSummaries.push({
                    bookId: book.bookId,
                    bookTitle: `${book.bookTitle} (${book.class})`, // Indicate it's from a different class
                    bookPrice: book.price,
                    totalPaid: paymentsInSelectedYear,
                    balance: balance,
                    status: 'Partial',
                });
            }
        });
        
        const totalBalance = bookSummaries.reduce((sum, b) => sum + b.balance, 0);

        return {
            studentId: student.studentId,
            studentName: student.studentName,
            class: student.class,
            books: bookSummaries.sort((a,b) => a.bookTitle.localeCompare(b.bookTitle)),
            totalBalance: totalBalance,
        };
    });
  }, [activeStudents, books, payments, selectedAcademicYearId]);

  const filteredProfiles = React.useMemo(() => {
    let profiles = [...studentProfiles];

    if (outstandingFilter) {
      profiles = profiles
        .filter(p => p.totalBalance > 0) // Keep students with a balance
        .map(p => ({
          ...p,
          // For those students, only show books that actually have a balance
          books: p.books.filter(b => b.balance > 0),
        }));
    }

    if (searchTerm) {
      profiles = profiles.filter(profile =>
        profile.studentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return profiles;
  }, [studentProfiles, searchTerm, outstandingFilter]);

  const { totalDue, totalReceived, totalOutstanding } = React.useMemo(() => {
    const currentAcademicYearId = selectedAcademicYearId;
    if (!currentAcademicYearId) {
        return { totalDue: 0, totalReceived: 0, totalOutstanding: 0 };
    }

    const received = payments
        .filter(p => p.academicYearId === currentAcademicYearId)
        .reduce((sum, p) => sum + p.amountPaid, 0);

    const outstanding = studentProfiles.reduce((sum, profile) => sum + profile.totalBalance, 0);

    const due = received + outstanding;

    return { totalDue: due, totalReceived: received, totalOutstanding: outstanding };
}, [studentProfiles, payments, selectedAcademicYearId]);

  const handleExportCsv = () => {
    const flatData = filteredProfiles.flatMap(profile => {
        if (profile.books.length === 0) {
            return [{
                studentName: profile.studentName,
                class: profile.class,
                bookTitle: "No books assigned",
                bookPrice: 0,
                totalPaid: 0,
                balance: 0,
                status: "N/A"
            }];
        }
        return profile.books.map(book => ({
            studentName: profile.studentName,
            class: profile.class,
            bookTitle: book.bookTitle,
            bookPrice: book.bookPrice,
            totalPaid: book.totalPaid,
            balance: book.balance,
            status: book.status
        }))
    });

    if (flatData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "The current view has no data to export.",
      });
      return;
    }

    const headers = ["Student Name", "Class", "Book Title", "Book Price (GHS)", "Total Paid (GHS)", "Balance (GHS)", "Status"];
    
    const sortedData = [...flatData].sort((a, b) => {
        const classAIndex = CLASS_ORDER.indexOf(a.class);
        const classBIndex = CLASS_ORDER.indexOf(b.class);
        if (classAIndex !== classBIndex) {
            return classAIndex - classBIndex;
        }
        return a.studentName.localeCompare(b.studentName);
    });

    const csvRows = sortedData.map(item => [
      `"${item.studentName.replace(/"/g, '""')}"`,
      item.class,
      `"${item.bookTitle.replace(/"/g, '""')}"`,
      item.bookPrice.toFixed(2),
      item.totalPaid.toFixed(2),
      item.balance.toFixed(2),
      item.status
    ].join(","));

    const overallTotals = studentProfiles.reduce((acc, p) => {
        acc.balance += p.totalBalance;
        p.books.forEach(b => {
            acc.price += b.bookPrice;
            acc.paid += b.totalPaid;
        })
        return acc;
    }, { price: 0, paid: 0, balance: 0 });

    csvRows.push(''); // Add a blank line for separation
    csvRows.push([
        '"Grand Total"',
        '', // class
        '', // book title
        overallTotals.price.toFixed(2),
        overallTotals.paid.toFixed(2),
        overallTotals.balance.toFixed(2),
        '' // status
    ].join(','));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `book-payments-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "The CSV file has been downloaded.",
    });
  };

  const handleExportPdf = () => {
    if (filteredProfiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "The current view has no data to export.",
      });
      return;
    }
    
    const doc = new jsPDF();
    const selectedYear = academicYears.find(y => y.academicYearId === selectedAcademicYearId);
    const currentAcademicYear = selectedYear ? selectedYear.year : "Selected Academic Year";
    
    doc.setFontSize(18);
    doc.text("Student Book Payment Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(currentAcademicYear, 14, 29);

    const studentGroups = filteredProfiles;
    const tableHead = [["Book Title", "Price (GHS)", "Paid (GHS)", "Balance (GHS)", "Status"]];
    let finalY = 35;
    const overallTotals = { price: 0, paid: 0, balance: 0 };

    CLASS_CATEGORIES.forEach(category => {
        const studentsInCategory = studentGroups
            .filter(group => category.options.includes(group.class));

        if (studentsInCategory.length === 0) return;

        if (finalY > 240) {
            doc.addPage();
            finalY = 20;
        }

        finalY += 10;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(category.label, 14, finalY);
        finalY += 2;
        
        category.options.forEach(className => {
            const studentsInClass = studentsInCategory
                .filter(student => student.class === className)
                .sort((a,b) => a.studentName.localeCompare(b.studentName));
            
            if (studentsInClass.length === 0) return;
            
            finalY += 8;
            if (finalY > 250) { 
                doc.addPage();
                finalY = 20;
            }
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(className, 14, finalY);
            doc.setTextColor(0);
            finalY += 2;

            studentsInClass.forEach((group) => {
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }
                finalY += 7;
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${group.studentName}`, 14, finalY);
                finalY += 6;

                const studentTotals = { price: 0, paid: 0, balance: 0 };
                const tableRows = group.books.map(book => {
                    studentTotals.price += book.bookPrice;
                    studentTotals.paid += book.totalPaid;
                    studentTotals.balance += book.balance;
                    
                    overallTotals.price += book.bookPrice;
                    overallTotals.paid += book.totalPaid;
                    overallTotals.balance += book.balance;

                    return [
                        book.bookTitle,
                        book.bookPrice.toFixed(2),
                        book.totalPaid.toFixed(2),
                        book.balance.toFixed(2),
                        book.status
                    ];
                });

                if (group.books.length === 0) {
                    tableRows.push([{ content: "No required books for this class.", colSpan: 5, styles: { halign: 'center' } }])
                } else {
                    tableRows.push([
                        { content: 'Student Total', colSpan: 1, styles: { fontStyle: 'bold', halign: 'right' } },
                        { content: studentTotals.price.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
                        { content: studentTotals.paid.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
                        { content: studentTotals.balance.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
                        ''
                    ]);
                }
                
                autoTable(doc, {
                    head: tableHead,
                    body: tableRows,
                    startY: finalY,
                    headStyles: { fillColor: [37, 99, 235] },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                    },
                    didDrawCell: (data) => {
                      if (data.section === 'head' && data.column.index > 0) {
                        data.cell.styles.halign = 'center';
                      }
                    },
                    didDrawPage: (data) => {
                      const pageCount = doc.getNumberOfPages();
                      doc.setFontSize(10);
                      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
                    }
                });

                finalY = (doc as any).lastAutoTable.finalY;
            });

        });

    });


    // Add overall totals table
    finalY += 10;
    if (finalY > 260) {
        doc.addPage();
        finalY = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Summary', 14, finalY);

    autoTable(doc, {
        startY: finalY + 5,
        head: [["", "Total Price (GHS)", "Total Paid (GHS)", "Total Outstanding (GHS)"]],
        body: [[
            'Grand Totals',
            overallTotals.price.toFixed(2),
            overallTotals.paid.toFixed(2),
            overallTotals.balance.toFixed(2),
        ]],
        headStyles: { fillColor: [37, 99, 235] },
        bodyStyles: { fontStyle: 'bold', fontSize: 11 },
        columnStyles: {
            0: { halign: 'right', fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
        },
        didDrawCell: (data) => {
            if (data.section === 'head') {
                if (data.column.index === 0) {
                    data.cell.styles.halign = 'right';
                } else {
                    data.cell.styles.halign = 'center';
                }
            }
        }
    });

    doc.save(`BHA-Book-Payments-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
        title: "Export Successful",
        description: "The PDF file has been generated.",
    });
  };

  const handleAddStudent = async (studentData: Omit<Student, "status">) => {
    if (!firestore) return;
    
    const studentDocRef = doc(firestore, "students", studentData.studentId);
    try {
        const docSnap = await getDoc(studentDocRef);
        if (docSnap.exists()) {
            toast({
                variant: "destructive",
                title: "Duplicate Student ID",
                description: "A student with this ID already exists. Please use a unique ID.",
            });
            return;
        }
    } catch (error) {
        console.error("Error checking student ID uniqueness:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not verify student ID. Please try again." });
        return;
    }
    
    const isDuplicate = students.some(
      s => 
        s.studentName.trim().toLowerCase() === studentData.studentName.trim().toLowerCase() &&
        s.parentName.trim().toLowerCase() === studentData.parentName.trim().toLowerCase() &&
        s.parentPhone.trim() === studentData.parentPhone.trim()
    );

    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Duplicate Student",
            description: "A student with the same name, parent name, and phone already exists.",
        });
        return;
    }
    
    const newStudent = { ...studentData, status: 'Active' as const };

    setDoc(studentDocRef, newStudent)
      .then(() => toast({ title: "Student Registered", description: `${newStudent.studentName} has been added.` }))
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: studentDocRef.path,
            operation: 'create',
            requestResourceData: newStudent
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleUpdateStudent = async (studentData: Student) => {
    if (!firestore) return;

    const isDuplicate = students.some(
        s =>
          s.studentId !== studentData.studentId &&
          s.studentName.trim().toLowerCase() === studentData.studentName.trim().toLowerCase() &&
          s.parentName.trim().toLowerCase() === studentData.parentName.trim().toLowerCase() &&
          s.parentPhone.trim() === studentData.parentPhone.trim()
    );

    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Duplicate Student",
            description: "Another student with the same name, parent name, and phone already exists.",
        });
        return;
    }

    const studentDocRef = doc(firestore, "students", studentData.studentId);
    
    setDoc(studentDocRef, studentData, { merge: true })
      .then(() => toast({ title: "Student Updated", description: `${studentData.studentName}'s details have been updated.` }))
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: studentDocRef.path,
            operation: 'update',
            requestResourceData: studentData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleSaveStudent = (studentData: Omit<Student, "status"> | Student) => {
    if ('status' in studentData) {
      handleUpdateStudent(studentData as Student);
    } else {
      handleAddStudent(studentData as Omit<Student, "status">);
    }
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!firestore) return;
    const studentDocRef = doc(firestore, "students", studentId);
    const paymentsQuery = query(collection(firestore, "payments"), where("studentId", "==", studentId));

    try {
        const batch = writeBatch(firestore);
        batch.delete(studentDocRef);
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();

        toast({ variant: "destructive", title: "Student Deleted", description: "The student and all their associated payment records have been deleted." });
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: studentDocRef.path,
            operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, "bookId">) => {
    if (!firestore) return;
    
    const isDuplicate = books.some(
        b => 
          b.bookTitle.trim().toLowerCase() === bookData.bookTitle.trim().toLowerCase() &&
          b.class === bookData.class
    );

    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Duplicate Book",
            description: "A book with the same title for this class already exists.",
        });
        return;
    }

    const bookId = `B${Date.now()}`;
    const bookDocRef = doc(firestore, "books", bookId);
    const newBook = { ...bookData, bookId };

    setDoc(bookDocRef, newBook)
      .then(() => toast({ title: "Book Registered", description: `${newBook.bookTitle} has been added.` }))
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: bookDocRef.path, operation: 'create', requestResourceData: newBook }));
      });
  };
  
  const handleUpdateBook = async (bookData: Book) => {
    if (!firestore) return;

    const isDuplicate = books.some(
        b =>
          b.bookId !== bookData.bookId &&
          b.bookTitle.trim().toLowerCase() === bookData.bookTitle.trim().toLowerCase() &&
          b.class === bookData.class
    );

    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Duplicate Book",
            description: "Another book with the same title for this class already exists.",
        });
        return;
    }

    const bookDocRef = doc(firestore, "books", bookData.bookId);

    setDoc(bookDocRef, bookData, { merge: true })
      .then(() => toast({ title: "Book Updated", description: `${bookData.bookTitle} has been updated.` }))
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: bookDocRef.path, operation: 'update', requestResourceData: bookData }));
      });
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!firestore) return;
    const bookDocRef = doc(firestore, "books", bookId);
    const paymentsQuery = query(collection(firestore, "payments"), where("bookId", "==", bookId));

    try {
        const batch = writeBatch(firestore);
        batch.delete(bookDocRef);
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();

        toast({ variant: "destructive", title: "Book Deleted", description: "The book and associated payments have been deleted." });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: bookDocRef.path, operation: 'delete' }));
    }
  };

  const handleAddAcademicYear = async (academicYearData: Omit<AcademicYear, "academicYearId">) => {
    if (!firestore) return;
    const academicYearId = `AY${Date.now()}`;
    const academicYearDocRef = doc(firestore, "academicYears", academicYearId);
    const newAcademicYear = { ...academicYearData, academicYearId };
    
    setDoc(academicYearDocRef, newAcademicYear)
      .then(() => toast({ title: "Academic Year Added", description: `${newAcademicYear.year} has been added.` }))
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: academicYearDocRef.path, operation: 'create', requestResourceData: newAcademicYear }));
      });
  };
  
  const handleAddPayment = async (data: { studentId: string; bookIds: string[]; amountPaid: number; method: 'Cash' | 'Mobile Money' | 'Bank Transfer'; academicYearId: string; }) => {
    if (!firestore) return;
    const { studentId, bookIds, amountPaid, method, academicYearId } = data;
    const student = students.find(s => s.studentId === studentId);
    
    if (!academicYearId) { toast({ variant: "destructive", title: "Error", description: "An academic year must be selected." }); return; }
    if (!student) { toast({ variant: "destructive", title: "Error", description: "Student not found." }); return; }

    let remainingAmount = amountPaid;
    const newPaymentsForReceipt: { payment: Payment; balanceAfterPayment: number }[] = [];
    const booksToPay = books.filter(b => bookIds.includes(b.bookId));
    
    const batch = writeBatch(firestore);

    for (const book of booksToPay) {
        if (remainingAmount <= 0) break;

        const totalPaidForBook = payments
            .filter(p => p.studentId === studentId && p.bookId === book.bookId)
            .reduce((acc, p) => acc + p.amountPaid, 0);

        const outstandingBalance = Math.max(0, book.price - totalPaidForBook);

        if (outstandingBalance <= 0) continue;
        
        const amountToPayForBook = Math.min(remainingAmount, outstandingBalance);
        
        if (amountToPayForBook > 0) {
            const paymentRef = doc(collection(firestore, "payments"));
            const newPaymentData = {
                paymentId: paymentRef.id,
                date: serverTimestamp(),
                studentId,
                bookId: book.bookId,
                academicYearId,
                amountPaid: amountToPayForBook,
                method,
            };
            batch.set(paymentRef, newPaymentData);
            remainingAmount -= amountToPayForBook;
            newPaymentsForReceipt.push({
                payment: { ...newPaymentData, date: new Date() }, 
                balanceAfterPayment: outstandingBalance - amountToPayForBook 
            });
        }
    }
    
    if (newPaymentsForReceipt.length > 0) {
      try {
        await batch.commit();
        const totalAmountActuallyPaid = amountPaid - remainingAmount;
        setOpenDialog(null);
        toast({
          title: "Payment Recorded",
          description: `Payment of ${formatCurrency(totalAmountActuallyPaid)} for ${student.studentName} was successful.`,
          action: (
            <ToastAction 
              altText="Print Receipt" 
              onClick={() => setReceiptData({ student, newPaymentsWithBalance: newPaymentsForReceipt, books, totalAmountPaid: totalAmountActuallyPaid })}
            >
              Print Receipt
            </ToastAction>
          ),
        });
      } catch (error) {
        // This is a generic error handler for the batch write.
        // A more specific error would ideally be caught inside a loop if writes were individual,
        // but for a batch, we can only signal a general failure on the 'payments' path.
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: '/payments', operation: 'create', requestResourceData: newPaymentsForReceipt }));
      }
    } else if (amountPaid > 0) {
        toast({ title: "No Payment Recorded", description: "The selected books have no outstanding balance." });
    } else {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Payment amount must be positive." });
    }
  };

  const handlePrintHistoricalReceipt = (paymentToPrint: Payment) => {
    const student = students.find(s => s.studentId === paymentToPrint.studentId);
    if (!student) {
      toast({ variant: "destructive", title: "Error", description: "Student not found for this receipt." });
      return;
    }

    const book = books.find(b => b.bookId === paymentToPrint.bookId);
    if (!book) {
        toast({ variant: "destructive", title: "Error", description: "Book not found for this receipt." });
        return;
    }

    // To calculate the balance correctly, we need all payments for this specific book for this student
    const allPaymentsForThisBook = payments
        .filter(p => p.studentId === student.studentId && p.bookId === book.bookId)
        .sort((a, b) => a.date.getTime() - b.date.getTime()); // sort by date ascending

    let amountPaidUpToThisPoint = 0;
    // Sum payments up to and including the one we are printing the receipt for
    for (const p of allPaymentsForThisBook) {
        amountPaidUpToThisPoint += p.amountPaid;
        if (p.paymentId === paymentToPrint.paymentId) {
            break; // Stop summing once we've reached the payment in question
        }
    }

    const balanceAfterPayment = book.price - amountPaidUpToThisPoint;

    const receiptInfo: ReceiptInfo = {
        student,
        books, // Pass all books for lookup in the receipt component
        totalAmountPaid: paymentToPrint.amountPaid, // The total for *this* receipt is just this payment's amount
        newPaymentsWithBalance: [{
            payment: paymentToPrint,
            balanceAfterPayment: balanceAfterPayment,
        }]
    };

    setReceiptData(receiptInfo);
    // When printing a historical receipt, also close the history dialog
    setViewingPayments(null);
  };


  const handleDeletePayment = (paymentId: string) => {
    if (!firestore) return;
    const paymentDocRef = doc(firestore, "payments", paymentId);
    deleteDoc(paymentDocRef)
      .then(() => toast({ variant: "destructive", title: "Payment Deleted", description: `The payment record has been deleted.` }))
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: paymentDocRef.path, operation: 'delete' }));
      });
  };

  const handlePromoteStudents = async (promotedStudentIds: string[]) => {
    if (!firestore || !students.length) return;

    const getNextClass = (currentClass: string): string | null => {
        const currentIndex = CLASS_ORDER.indexOf(currentClass);
        if (currentIndex === -1 || currentIndex === CLASS_ORDER.length - 1) {
            return null;
        }
        return CLASS_ORDER[currentIndex + 1];
    };

    const batch = writeBatch(firestore);
    let promotedCount = 0;
    let graduatedCount = 0;

    promotedStudentIds.forEach(studentId => {
      const student = students.find(s => s.studentId === studentId);
      if (!student) return;

      const studentRef = doc(firestore, "students", student.studentId);
      const nextClass = getNextClass(student.class);

      if (nextClass) {
        batch.update(studentRef, { class: nextClass });
        promotedCount++;
      } else {
        batch.update(studentRef, { status: "Graduated" });
        graduatedCount++;
      }
    });

    try {
      await batch.commit();
      toast({
        title: "Promotion Successful",
        description: `${promotedCount} students promoted, and ${graduatedCount} students graduated.`,
      });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Promotion Failed",
            description: e.message || "An error occurred while updating student records.",
        });
    }
  };


  if (studentsLoading || booksLoading || academicYearsLoading || paymentsLoading || userProfileLoading || (academicYears.length > 0 && !selectedAcademicYearId)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading data...</span>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 font-semibold">
          <BookIcon className="h-6 w-6 text-primary" />
          <span className="text-lg">BHA Book Payment Tracker</span>
        </div>
        <div className="ml-auto">
            <Button variant="ghost" onClick={() => auth?.signOut().then(() => router.push('/login'))}>Sign Out</Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {isAdmin && (
            <Dashboard
            totalDue={totalDue}
            totalReceived={totalReceived}
            totalOutstanding={totalOutstanding}
            onOutstandingClick={handleToggleOutstandingFilter}
            isOutstandingFiltered={outstandingFilter}
            />
        )}
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-2 w-full">
                        {isAdmin && (
                            <Dialog open={openDialog === 'add-payment'} onOpenChange={(isOpen) => setOpenDialog(isOpen ? 'add-payment' : null)}>
                                <DialogTrigger asChild>
                                    <Button variant="default"><CircleDollarSign/>Record Payment</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[480px]">
                                    <DialogHeader><DialogTitle>Record a New Payment</DialogTitle></DialogHeader>
                                    <ScrollArea className="max-h-[75vh] -mx-6 px-6">
                                        <AddPaymentForm 
                                        students={activeStudents} 
                                        books={books} 
                                        academicYears={academicYears} 
                                        payments={payments}
                                        onAddPayment={handleAddPayment} 
                                        onClose={() => setOpenDialog(null)} 
                                        />
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>
                        )}
                        <ManageStudentsDialog
                            students={students}
                            onSave={handleSaveStudent}
                            onDelete={handleDeleteStudent}
                            onPromote={handlePromoteStudents}
                            isAdmin={isAdmin}
                        />

                        <ManageBooksDialog
                            books={books}
                            onAddBook={handleAddBook}
                            onUpdateBook={handleUpdateBook}
                            onDeleteBook={handleDeleteBook}
                            isAdmin={isAdmin}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search students..."
                                className="w-full rounded-lg bg-background pl-8 sm:w-[240px]"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {isAdmin && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="shrink-0">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportCsv}>
                                Export to CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>
                                Export to PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex flex-col sm:flex-row gap-2 items-center border-t pt-4">
                        <Dialog open={openDialog === 'add-academic-year'} onOpenChange={(isOpen) => setOpenDialog(isOpen ? 'add-academic-year' : null)}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><CalendarPlus />Add Academic Year</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add a New Academic Year</DialogTitle></DialogHeader>
                                <AddAcademicYearForm onAddAcademicYear={handleAddAcademicYear} onClose={() => setOpenDialog(null)} />
                            </DialogContent>
                        </Dialog>
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Select value={selectedAcademicYearId} onValueChange={(value) => value && setSelectedAcademicYearId(value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Academic Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(year => (
                                        <SelectItem key={year.academicYearId} value={year.academicYearId}>
                                        {year.year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <StudentPaymentTable 
          profiles={filteredProfiles} 
          students={students}
          onEditStudent={setEditingStudent}
          onViewPayments={setViewingPayments}
        />
      </main>

      <Dialog open={!!editingStudent} onOpenChange={(isOpen) => !isOpen && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
          <AddStudentForm 
            onSave={handleSaveStudent} 
            onClose={() => setEditingStudent(null)} 
            initialData={editingStudent!} 
          />
        </DialogContent>
      </Dialog>
      
      <PaymentHistoryDialog
        isOpen={!!viewingPayments}
        onClose={() => setViewingPayments(null)}
        student={viewingPayments}
        payments={payments}
        books={books}
        academicYears={academicYears}
        onDeletePayment={handleDeletePayment}
        onPrintReceipt={handlePrintHistoricalReceipt}
        isAdmin={isAdmin}
      />

      <ReceiptDialog
        isOpen={!!receiptData}
        onClose={() => setReceiptData(null)}
        receiptData={receiptData}
      />

    </div>
  );
}
