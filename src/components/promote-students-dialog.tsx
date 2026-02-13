
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    AccordionHeader
} from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Student } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { ArrowRight, GraduationCap } from "lucide-react";
import { CLASS_ORDER } from "@/lib/class-order";

const getNextClass = (currentClass: string): string | null => {
    const currentIndex = CLASS_ORDER.indexOf(currentClass);
    if (currentIndex === -1 || currentIndex === CLASS_ORDER.length - 1) {
        return null; // This is the last class, student will graduate
    }
    return CLASS_ORDER[currentIndex + 1];
};

type PromoteStudentsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onPromote: (promotedStudentIds: string[]) => Promise<void>;
};

export function PromoteStudentsDialog({ isOpen, onClose, students, onPromote }: PromoteStudentsDialogProps) {
  // By default, all active students are selected for promotion.
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<Set<string>>(
    () => new Set(students.filter(s => s.status !== 'Graduated').map(s => s.studentId))
  );
  const [isPromoting, setIsPromoting] = React.useState(false);

  // Re-initialize selection when students prop changes or dialog opens
  React.useEffect(() => {
    if (isOpen) {
        setSelectedStudentIds(new Set(students.filter(s => s.status !== 'Graduated').map(s => s.studentId)));
        setIsPromoting(false);
    }
  }, [isOpen, students]);

  const studentsByClass = React.useMemo(() => {
    return students
        .filter(s => s.status !== 'Graduated' && s.status !== 'Graduated')
        .reduce((acc, student) => {
            if (!acc[student.class]) {
                acc[student.class] = [];
            }
            acc[student.class].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
  }, [students]);

  const sortedClasses = Object.keys(studentsByClass).sort((a, b) => {
    return CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b);
  });

  const handleStudentToggle = (studentId: string, checked: boolean) => {
    setSelectedStudentIds(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(studentId);
        } else {
            newSet.delete(studentId);
        }
        return newSet;
    });
  };

  const handleClassToggle = (classStudents: Student[], checked: boolean) => {
      setSelectedStudentIds(prev => {
          const newSet = new Set(prev);
          const studentIds = classStudents.map(s => s.studentId);
          if (checked) {
              studentIds.forEach(id => newSet.add(id));
          } else {
              studentIds.forEach(id => newSet.delete(id));
          }
          return newSet;
      });
  };

  const numToPromote = selectedStudentIds.size;
  const numToGraduate = Array.from(selectedStudentIds).filter(id => {
      const student = students.find(s => s.studentId === id);
      return student && getNextClass(student.class) === null;
  }).length;
  const numToStay = students.filter(s => s.status !== 'Graduated').length - numToPromote;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>End-of-Year Student Promotion</DialogTitle>
          <DialogDescription>
            Review the list of students to promote them to the next class or graduate them. Uncheck any student who should repeat their current class.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] border rounded-md">
            <Accordion type="multiple" className="w-full" defaultValue={sortedClasses}>
                {sortedClasses.map(className => {
                    const classStudents = studentsByClass[className];
                    const nextClass = getNextClass(className);
                    const allInClassSelected = classStudents.every(s => selectedStudentIds.has(s.studentId));
                    const isGraduatingClass = !nextClass;

                    return (
                        <AccordionItem value={className} key={className}>
                            <AccordionHeader className="flex items-center px-4 bg-muted/50">
                                <Checkbox
                                    checked={allInClassSelected}
                                    onCheckedChange={(checked) => handleClassToggle(classStudents, !!checked)}
                                    aria-label={`Select all students in ${className}`}
                                />
                                <AccordionTrigger className="hover:no-underline ml-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{className}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        {isGraduatingClass ? (
                                            <span className="flex items-center gap-1 font-semibold text-destructive"><GraduationCap className="h-4 w-4" /> Graduate</span>
                                        ) : (
                                            <span className="font-semibold text-accent">{nextClass}</span>
                                        )}
                                    </div>
                                </AccordionTrigger>
                            </AccordionHeader>
                            <AccordionContent className="p-0">
                                <div className="divide-y">
                                {classStudents.map(student => (
                                    <div key={student.studentId} className="flex items-center px-4 py-2 space-x-3">
                                        <Checkbox
                                            id={`student-${student.studentId}`}
                                            checked={selectedStudentIds.has(student.studentId)}
                                            onCheckedChange={(checked) => handleStudentToggle(student.studentId, !!checked)}
                                        />
                                        <Label htmlFor={`student-${student.studentId}`} className="font-normal w-full cursor-pointer">
                                            {student.studentName}
                                        </Label>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </ScrollArea>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t -mx-6 -mb-6 px-6 py-4">
            <div className="text-sm text-muted-foreground flex-1">
                <strong>{numToPromote - numToGraduate}</strong> to promote, <strong>{numToGraduate}</strong> to graduate, <strong>{numToStay}</strong> to repeat.
            </div>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={numToPromote === 0 || isPromoting}>
                  {isPromoting ? "Finalizing..." : "Finalize Promotions"}
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will update student records based on your selections. This cannot be easily undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm">
                  <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                      <li><strong>{numToPromote - numToGraduate}</strong> students will be promoted to the next class.</li>
                      <li><strong>{numToGraduate}</strong> students will be marked as "Graduated".</li>
                      <li><strong>{numToStay}</strong> students will remain in their current class.</li>
                  </ul>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isPromoting}
                    onClick={async () => {
                      setIsPromoting(true);
                      await onPromote(Array.from(selectedStudentIds));
                      onClose();
                    }}
                  >
                    {isPromoting ? "Finalizing..." : "Yes, Finalize Promotions"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
