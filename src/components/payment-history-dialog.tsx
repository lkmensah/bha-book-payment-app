
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Book, Payment, Student, AcademicYear } from "@/lib/data";
import { format } from "date-fns";
import { Trash2, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

type PaymentHistoryDialogProps = {
  student: Student | null;
  payments: Payment[];
  books: Book[];
  academicYears: AcademicYear[];
  onDeletePayment: (paymentId: string) => void;
  onPrintReceipt: (payment: Payment) => void;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
};

export function PaymentHistoryDialog({ student, payments, books, academicYears, onDeletePayment, onPrintReceipt, isOpen, onClose, isAdmin }: PaymentHistoryDialogProps) {
  if (!student) return null;

  const studentPayments = payments
    .filter(p => p.studentId === student.studentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const getBookTitle = (bookId: string) => books.find(b => b.bookId === bookId)?.bookTitle || "N/A";
  const getAcademicYear = (academicYearId: string) => {
    const academicYear = academicYears.find(t => t.academicYearId === academicYearId);
    return academicYear ? academicYear.year : "N/A";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payment History for {student.studentName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Method</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentPayments.length > 0 ? (
                studentPayments.map((payment) => (
                  <TableRow key={payment.paymentId}>
                    <TableCell>{format(payment.date, "PPP")}</TableCell>
                    <TableCell>{getBookTitle(payment.bookId)}</TableCell>
                    <TableCell>{getAcademicYear(payment.academicYearId)}</TableCell>
                    <TableCell>{formatCurrency(payment.amountPaid)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Print Receipt" onClick={() => onPrintReceipt(payment)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to delete this payment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the payment record of {formatCurrency(payment.amountPaid)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeletePayment(payment.paymentId)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                    No payments recorded for this student.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
