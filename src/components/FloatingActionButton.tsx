import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FloatingActionButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              type="button" // Added type="button"
              size="lg"
              className="rounded-full h-16 w-16 bg-neon-green text-primary-foreground shadow-neon-green-md hover:bg-neon-green/90 transition-all duration-300"
            >
              <Plus className="h-8 w-8" />
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg shadow-lg p-2">
          <DropdownMenuItem
            onClick={() => navigate('/add-sale')}
            className="flex items-center p-2 cursor-pointer hover:bg-gray-700 rounded-md transition-colors text-neon-green"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Sale
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/add-expense')}
            className="flex items-center p-2 cursor-pointer hover:bg-gray-700 rounded-md transition-colors text-destructive"
          >
            <MinusCircle className="mr-2 h-4 w-4" /> Add Expense
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FloatingActionButton;