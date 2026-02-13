
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@/lib/data";
import { UserPlus, Pencil, Trash2, Users } from "lucide-react";
import { AddStudentForm } from "./add-student-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { PromoteStudentsDialog } from "./promote-students-dialog";
import { Badge } from "./ui/badge";
import { CLASS_ORDER } from "@/lib/class-order";


type ManageStudentsDialogProps = {
  students: Student[];
  onSave: (student: Omit<Student, "status"> | Student) => void;
  onDelete: (studentId: string) => void;
  onPromote: (promotedStudentIds: string[]) => Promise<void>;
  isAdmin: boolean;
};

export function ManageStudentsDialog({ students, onSave, onDelete, onPromote, isAdmin }: ManageStudentsDialogProps) {
  const [isMainDialogOpen, setIsMainDialogOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = React.useState(false);

  const sortedStudents = React.useMemo(() => {
    return [...students].sort((a, b) => {
      const classAIndex = CLASS_ORDER.indexOf(a.class);
      const classBIndex = CLASS_ORDER.indexOf(b.class);

      if (classAIndex !== classBIndex) {
          return classAIndex - classBIndex;
      }
      
      return a.studentName.localeCompare(b.studentName);
    });
  }, [students]);

  const handleSaveStudent = (studentData: Omit<Student, "status"> | Student) => {
    onSave(studentData);
    handleCloseForm();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };
  
  const handleOpenRegister = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setEditingStudent(null);
    setIsFormOpen(false);
  };

  const handleFinalizePromotions = async (promotedStudentIds: string[]) => {
    await onPromote(promotedStudentIds);
    setIsPromoteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isMainDialogOpen} onOpenChange={setIsMainDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline"><Users />Manage Students</Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Students</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2">
              <Button onClick={handleOpenRegister}>
                <UserPlus className="mr-2 h-4 w-4" /> Register New Student
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => setIsPromoteDialogOpen(true)}>
                  <Users className="mr-2 h-4 w-4" /> Promote Students
                </Button>
              )}
          </div>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Parent Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.parentName}</TableCell>
                    <TableCell>{student.parentPhone}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'Graduated' ? 'secondary' : 'default'}>{student.status || 'Active'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the student ({student.studentName}) and all their associated payment records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(student.studentId)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Student" : "Register a New Student"}</DialogTitle>
          </DialogHeader>
          <AddStudentForm 
            onSave={handleSaveStudent} 
            onClose={handleCloseForm} 
            initialData={editingStudent ?? undefined}
          />
        </DialogContent>
      </Dialog>
      
      <PromoteStudentsDialog
        isOpen={isPromoteDialogOpen}
        onClose={() => setIsPromoteDialogOpen(false)}
        students={students}
        onPromote={onPromote}
      />
    </>
  );
}
