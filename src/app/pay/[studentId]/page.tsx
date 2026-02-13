"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import type { Student, Book, Payment, AcademicYear } from "@/lib/data";
import { collection, query, where, doc, orderBy, writeBatch, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { BookIcon } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ParentPaymentPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [isPaying, setIsPaying] = React.useState(false);

  const studentRef = useMemoFirebase(() =>
    firestore ? doc(firestore, "students", studentId) : null,
    [firestore, studentId]
  );
  const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

  const allBooksQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, "books") : null,
    [firestore]
  );
  const { data: allBooks, loading: booksLoading } = useCollection<Book>(allBooksQuery);

  const paymentsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "payments"), where("studentId", "==", studentId)) : null,
    [firestore, studentId]
  );
  const { data: paymentsData, loading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
   
  const academicYearsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "academicYears"), orderBy("year", "desc")) : null,
    [firestore]
  );
  const { data: academicYears, loading: academicYearsLoading } = useCollection<AcademicYear>(academicYearsQuery);

  const payments = React.useMemo(() => {
    if (!paymentsData) return [];
    return paymentsData.map(p => ({
        ...p,
        date: (p.date as any)?.toDate ? (p.date as any).toDate() : new Date(p.date),
    }));
  }, [paymentsData]);


  const outstandingBooks = React.useMemo(() => {
    if (!student || !allBooks || !payments) return [];

    const studentPaymentHistoryBookIds = new Set(payments.map(p => p.bookId));

    const relevantBooks = allBooks.filter(book => 
        book.class === student.class || studentPaymentHistoryBookIds.has(book.bookId)
    );

    return relevantBooks
      .map(book => {
        const paymentsForBook = payments.filter(p => p.bookId === book.bookId);
        const totalPaid = paymentsForBook.reduce((sum, p) => sum + p.amountPaid, 0);
        const balance = book.price - totalPaid;
        return { ...book, balance };
      })
      .filter(book => book.balance > 0)
      .sort((a,b) => a.bookTitle.localeCompare(b.bookTitle));
  }, [student, allBooks, payments]);


  const totalOutstanding = React.useMemo(() => {
    return outstandingBooks.reduce((sum, book) => sum + book.balance, 0);
  }, [outstandingBooks]);

  const handlePayment = async () => {
    const amountToPay = parseFloat(paymentAmount);

    if (!firestore || !student || !academicYears?.length) {
        toast({ variant: "destructive", title: "System Error", description: "Could not process payment at this time." });
        return;
    }
    if (isNaN(amountToPay) || amountToPay <= 0) {
        toast({
            variant: "destructive",
            title: "Invalid Amount",
            description: "Please enter a valid positive amount to pay.",
        });
        return;
    }
    if (amountToPay > totalOutstanding) {
        toast({
            variant: "destructive",
            title: "Amount Exceeds Balance",
            description: `Payment cannot be more than the outstanding balance of ${formatCurrency(totalOutstanding)}.`,
        });
        return;
    }

    setIsPaying(true);

    const latestAcademicYearId = academicYears[0].academicYearId;
    const batch = writeBatch(firestore);
    let remainingAmountToDistribute = amountToPay;

    try {
        for (const book of outstandingBooks) {
            if (remainingAmountToDistribute <= 0) break;

            const paymentForThisBook = Math.min(remainingAmountToDistribute, book.balance);
            
            if (paymentForThisBook > 0) {
                const paymentRef = doc(collection(firestore, "payments"));
                const newPayment: Omit<Payment, 'date' | 'paymentId'> = {
                    studentId: student.studentId,
                    bookId: book.bookId,
                    academicYearId: latestAcademicYearId,
                    amountPaid: paymentForThisBook,
                    method: "Cash", // Simulating a cash payment
                };
                batch.set(paymentRef, { ...newPayment, paymentId: paymentRef.id, date: serverTimestamp() });
                remainingAmountToDistribute -= paymentForThisBook;
            }
        }

        await batch.commit();

        toast({
            title: "Payment Simulation Successful",
            description: `A payment of ${formatCurrency(amountToPay)} for ${student.studentName} has been recorded.`,
        });
        setPaymentAmount(""); // Reset input field

    } catch (error) {
        console.error("Payment simulation failed:", error);
        toast({
            variant: "destructive",
            title: "Simulation Failed",
            description: "Could not record the simulated payment.",
        });
    } finally {
        setIsPaying(false);
    }
  };

  const parsedPaymentAmount = parseFloat(paymentAmount);
  const showAmountInButton = !isNaN(parsedPaymentAmount) && parsedPaymentAmount > 0;

  const isLoading = studentLoading || booksLoading || paymentsLoading || academicYearsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading payment details...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-destructive">Student Not Found</h2>
          <p className="text-muted-foreground">The student ID might be incorrect.</p>
          <Button asChild variant="link">
            <Link href="/pay">Try Again</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <BookIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Book Payment for {student.studentName}</CardTitle>
          <CardDescription>
            Class: {student.class}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outstandingBooks.length > 0 ? (
            <div className="space-y-6">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book Title</TableHead>
                      <TableHead className="text-right">Outstanding Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingBooks.map(book => (
                      <TableRow key={book.bookId}>
                        <TableCell>{book.bookTitle}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(book.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-muted p-4 rounded-md font-semibold text-lg">
                    <span>Total Due</span>
                    <span className="font-mono">{formatCurrency(totalOutstanding)}</span>
                 </div>

                 <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="text-base font-medium">Amount to Pay</Label>
                    <Input
                        id="payment-amount"
                        type="number"
                        placeholder={formatCurrency(0)}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="h-12 text-lg"
                        min="0.01"
                        step="0.01"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                 </div>

                 <Button 
                    onClick={handlePayment} 
                    className="w-full" 
                    size="lg" 
                    disabled={isPaying || !paymentAmount || isNaN(parsedPaymentAmount) || parsedPaymentAmount <= 0 || parsedPaymentAmount > totalOutstanding}
                 >
                    {isPaying ? "Processing..." : `Pay ${showAmountInButton ? formatCurrency(parsedPaymentAmount) : ''} Now`}
                 </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-lg">No outstanding payments found for {student.studentName}.</p>
              <p>All book fees are settled. Thank you!</p>
            </div>
          )}
          <div className="text-center mt-6">
            <Button asChild variant="link">
                <Link href="/pay">Look up another student</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
