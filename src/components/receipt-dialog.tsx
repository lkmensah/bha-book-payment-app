
"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Book, Payment, Student } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Printer, X } from "lucide-react";
import { BookIcon } from "./icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReceiptDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    student: Student;
    newPaymentsWithBalance: {
        payment: Payment;
        balanceAfterPayment: number;
    }[];
    books: Book[];
    totalAmountPaid: number;
  } | null;
};

// Reusable receipt body for on-screen display
const ReceiptBody = ({ receiptData }: { receiptData: NonNullable<ReceiptDialogProps['receiptData']> }) => {
    const { student, newPaymentsWithBalance, books, totalAmountPaid } = receiptData;
    const paymentDate = newPaymentsWithBalance[0]?.payment.date;
    const paymentMethod = newPaymentsWithBalance[0]?.payment.method;

    return (
        <div className="text-sm">
            <div className="text-center items-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <BookIcon className="h-8 w-8 text-primary" />
                    <h2 className="text-2xl font-bold">BHA Book Payment Tracker</h2>
                </div>
                <p className="text-sm text-muted-foreground">Payment Receipt</p>
            </div>

            <div className="my-6 space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <p className="font-semibold text-muted-foreground">Student:</p>
                        <p className="font-medium">{student.studentName}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Class:</p>
                        <p className="font-medium">{student.class}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Date:</p>
                        <p className="font-medium">{paymentDate ? format(paymentDate, "PPP") : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Method:</p>
                        <p className="font-medium">{paymentMethod || 'N/A'}</p>
                    </div>
                </div>
                
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Amount Paid</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {newPaymentsWithBalance.map((pwb) => {
                                const book = books.find(b => b.bookId === pwb.payment.bookId);
                                return (
                                    <TableRow key={pwb.payment.paymentId}>
                                        <TableCell>{book?.bookTitle || 'Unknown Book'}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(pwb.payment.amountPaid)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(pwb.balanceAfterPayment)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="flex justify-end">
                    <div className="w-full sm:w-2/3 rounded-md bg-muted p-3 text-sm">
                        <div className="flex justify-between font-bold text-base">
                            <span>Total Paid</span>
                            <span className="font-mono">{formatCurrency(totalAmountPaid)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">Thank you for your payment.</p>
        </div>
    );
};


export function ReceiptDialog({ isOpen, onClose, receiptData }: ReceiptDialogProps) {
  if (!isOpen || !receiptData) {
    return null;
  }

  const handlePrint = () => {
    const doc = new jsPDF();
    const { student, newPaymentsWithBalance, books, totalAmountPaid } = receiptData;

    const drawReceipt = (startY: number) => {
      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("BHA Book Payment Tracker", 105, startY, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Payment Receipt", 105, startY + 5, { align: "center" });
      startY += 15;

      // Student Info
      doc.setFontSize(10);
      const paymentDate = newPaymentsWithBalance[0]?.payment.date;
      const paymentMethod = newPaymentsWithBalance[0]?.payment.method;
      doc.text(`Student: ${student.studentName}`, 14, startY);
      doc.text(`Class: ${student.class}`, 120, startY);
      startY += 7;
      doc.text(`Date: ${paymentDate ? format(paymentDate, "PPP") : 'N/A'}`, 14, startY);
      doc.text(`Method: ${paymentMethod || 'N/A'}`, 120, startY);
      startY += 10;

      // Table
      const head = [["Item", "Amount Paid", "Balance"]];
      const body = newPaymentsWithBalance.map((pwb) => {
          const book = books.find(b => b.bookId === pwb.payment.bookId);
          return [
              book?.bookTitle || 'Unknown Book',
              `GHS ${pwb.payment.amountPaid.toFixed(2)}`,
              `GHS ${pwb.balanceAfterPayment.toFixed(2)}`
          ];
      });

      autoTable(doc, {
          startY: startY,
          head: head,
          body: body,
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          columnStyles: {
              1: { halign: 'right' },
              2: { halign: 'right' },
          }
      });

      const finalY = (doc as any).lastAutoTable.finalY;

      // Total
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Total Paid:", 140, finalY + 10, { align: "right" });
      doc.text(`GHS ${totalAmountPaid.toFixed(2)}`, 195, finalY + 10, { align: 'right' });
      
      doc.setFontSize(8);
      doc.text("Thank you for your payment.", 105, finalY + 20, { align: 'center' });
      return finalY + 25;
    };

    const firstReceiptEndY = drawReceipt(20);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(10, firstReceiptEndY, 200, firstReceiptEndY);
    doc.setLineDashPattern([], 0);
    drawReceipt(firstReceiptEndY + 10);
    
    // Automatically trigger the print dialog in the new window
    doc.autoPrint();
    // Open the PDF in a new window or tab
    doc.output('dataurlnewwindow');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        <div className="pr-1">
          <ReceiptBody receiptData={receiptData} />
        </div>
        <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
