
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Book } from "@/lib/data";
import { BookPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddBookForm } from "./add-book-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { CLASS_ORDER } from "@/lib/class-order";

type ManageBooksDialogProps = {
  books: Book[];
  onAddBook: (book: Omit<Book, "bookId">) => void;
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  isAdmin: boolean;
};

export function ManageBooksDialog({ books, onAddBook, onUpdateBook, onDeleteBook, isAdmin }: ManageBooksDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const handleSaveBook = (bookData: Omit<Book, "bookId"> | Book) => {
    if ('bookId' in bookData) {
      onUpdateBook(bookData);
    } else {
      onAddBook(bookData);
    }
    handleCloseForm();
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };
  
  const handleOpenRegister = () => {
    setEditingBook(null);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setEditingBook(null);
    setIsFormOpen(false);
  };

  const sortedBooks = [...books].sort((a, b) => {
    const classAIndex = CLASS_ORDER.indexOf(a.class);
    const classBIndex = CLASS_ORDER.indexOf(b.class);
    
    if (classAIndex !== classBIndex) {
        return classAIndex - classBIndex;
    }
    
    return a.bookTitle.localeCompare(b.bookTitle);
  });

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline"><BookPlus />Manage Books</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Books</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
              <Button onClick={handleOpenRegister}>
                <BookPlus className="mr-2 h-4 w-4" /> Register New Book
              </Button>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Price (GHS)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBooks.map((book) => (
                  <TableRow key={book.bookId}>
                    <TableCell>{book.bookTitle}</TableCell>
                    <TableCell>{book.class}</TableCell>
                    <TableCell>{book.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(book)}>
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
                                This action cannot be undone. This will permanently delete the book and all associated payment records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteBook(book.bookId)}>Delete</AlertDialogAction>
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
            <DialogTitle>{editingBook ? "Edit Book" : "Register a New Book"}</DialogTitle>
          </DialogHeader>
          <AddBookForm 
            onSave={handleSaveBook} 
            onClose={handleCloseForm} 
            initialData={editingBook ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
