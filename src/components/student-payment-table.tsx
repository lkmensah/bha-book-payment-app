
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, CheckCircle2, ArrowUp, ArrowDown, MoreHorizontal, Pencil, History } from "lucide-react";
import type { StudentFinancialProfile, Student } from "@/lib/data";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { CLASS_ORDER } from "@/lib/class-order";

type SortKey = "studentName" | "totalBalance";
type SortDirection = "asc" | "desc";

interface StudentPaymentTableProps {
  students: Student[];
  profiles: StudentFinancialProfile[];
  onEditStudent: (student: Student) => void;
  onViewPayments: (student: Student) => void;
}

export function StudentPaymentTable({ students, profiles, onEditStudent, onViewPayments }: StudentPaymentTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const sortedProfiles = React.useMemo(() => {
    let sortableItems = [...profiles];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortConfig.key) {
          case "studentName":
            aValue = a.studentName.toLowerCase();
            bValue = b.studentName.toLowerCase();
            break;
          case "totalBalance":
            aValue = a.totalBalance;
            bValue = b.totalBalance;
            break;
          default:
            aValue = a.studentName.toLowerCase();
            bValue = b.studentName.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
        // Default sort: by class, then by student name.
        sortableItems.sort((a, b) => {
            const classAIndex = CLASS_ORDER.indexOf(a.class);
            const classBIndex = CLASS_ORDER.indexOf(b.class);
            if (classAIndex !== classBIndex) {
              return classAIndex - classBIndex;
            }
            return a.studentName.localeCompare(b.studentName);
        });
    }
    return sortableItems;
  }, [profiles, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/70" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-3 w-3" /> 
      : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const ActionsMenu = ({ student }: { student: Student | undefined }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => student && onEditStudent(student)}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit Student</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => student && onViewPayments(student)}>
          <History className="mr-2 h-4 w-4" />
          <span>Payment History</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Mobile & Tablet View: Cards */}
      <div className="space-y-4 lg:hidden">
        {sortedProfiles.length > 0 ? (
          sortedProfiles.map((profile) => {
            const fullStudent = students.find((s) => s.studentId === profile.studentId);
            return (
              <Card key={profile.studentId}>
                <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
                  <div>
                    <CardTitle className="text-lg">{profile.studentName}</CardTitle>
                    {fullStudent && (
                      <div className="text-xs text-muted-foreground">
                        ({fullStudent.parentName} &middot; {fullStudent.parentPhone})
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{profile.class}</p>
                  </div>
                  <ActionsMenu student={fullStudent} />
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-2">
                    {profile.books.length > 0 ? (
                      profile.books.map((book) => (
                        <div key={book.bookId} className="rounded-md border bg-muted/30 p-3 text-sm">
                          <div className="mb-2 flex items-start justify-between">
                            <h4 className="font-medium pr-2" title={book.bookTitle}>
                              {book.bookTitle}
                            </h4>
                            {book.status === 'Paid' ? (
                                <Badge variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Paid
                                </Badge>
                            ) : (
                                <Badge variant={book.status === 'Partial' ? "secondary" : "outline"} className="shrink-0">
                                    {book.status}
                                </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-xs text-muted-foreground">Price</div>
                              <div className="font-mono">{book.bookPrice.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Paid</div>
                              <div className="font-mono">{book.totalPaid.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Balance</div>
                              <div className="font-mono font-semibold text-destructive">{book.balance.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {profile.totalBalance > 0 ? "Outstanding balance from previous classes." : "No required books for this class."}
                      </div>
                    )}
                  </div>
                  {profile.books.length > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t pt-3 font-semibold">
                      <span>Total Balance:</span>
                      <span className="font-mono text-lg text-destructive">{profile.totalBalance.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No students found.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop View: Table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('studentName')}>Student Name {getSortIndicator('studentName')}</Button>
                  </TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Books &amp; Payment Status</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => requestSort('totalBalance')}>Total Balance (GHS) {getSortIndicator('totalBalance')}</Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProfiles.length > 0 ? (
                  sortedProfiles.map((profile) => {
                    const fullStudent = students.find(s => s.studentId === profile.studentId);
                    const allBooksPaid = profile.totalBalance <= 0;

                    return (
                    <TableRow key={profile.studentId} className="align-top">
                      <TableCell className="font-medium">
                        <div>{profile.studentName}</div>
                        {fullStudent && (
                          <div className="text-xs text-muted-foreground font-normal">
                            ({fullStudent.parentName} &middot; {fullStudent.parentPhone})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{profile.class}</TableCell>
                      <TableCell className="p-2">
                        <div className="grid grid-cols-12 gap-x-2 text-xs font-medium text-muted-foreground px-3 py-2 border-b">
                          <div className="col-span-4">Book Title</div>
                          <div className="col-span-2 text-right">Price (GHS)</div>
                          <div className="col-span-2 text-right">Paid (GHS)</div>
                          <div className="col-span-2 text-right">Balance (GHS)</div>
                          <div className="col-span-2 text-center pl-4">Status</div>
                        </div>
                        {profile.books.length > 0 ? (
                          <div className="space-y-1 py-1">
                            {profile.books.map((book) => (
                              <div key={book.bookId} className="grid grid-cols-12 gap-x-2 items-center text-sm px-3 py-1.5 rounded-md hover:bg-muted/50">
                                <div className="col-span-4 truncate" title={book.bookTitle}>{book.bookTitle}</div>
                                <div className="col-span-2 text-right font-mono">{book.bookPrice.toFixed(2)}</div>
                                <div className="col-span-2 text-right font-mono">{book.totalPaid.toFixed(2)}</div>
                                <div className="col-span-2 text-right font-mono">{book.balance.toFixed(2)}</div>
                                <div className="col-span-2 flex justify-center pl-4">
                                  {book.status === 'Paid' ? (
                                      <Badge variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
                                          <CheckCircle2 className="mr-1 h-3 w-3" />
                                          Paid
                                      </Badge>
                                  ) : (
                                      <Badge variant={book.status === 'Partial' ? "secondary" : "outline"}>
                                          {book.status}
                                      </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {allBooksPaid ? "All payments settled." : "No required books for this class."}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-destructive">{profile.totalBalance.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <ActionsMenu student={fullStudent} />
                      </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
