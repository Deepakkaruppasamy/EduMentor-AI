import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface ExcelImportWizardProps {
  onImportComplete: () => void;
  onClose: () => void;
}

interface ParsedUser {
  Name: string;
  Email: string;
  Department: string;
  Role: string;
  Course?: string;
  Semester?: string;
  Phone?: string;
  isValid: boolean;
  errors: string[];
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [credentials, setCredentials] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const validateUser = (user: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

    const name = user.Name || user.name || user.FullName || user['Full Name'];
    const email = user.Email || user.email || user.EmailAddress || user['Email Address'];
    const role = user.Role || user.role;
    const department = user.Department || user.department;

    if (!name) errors.push('Name is required.');
    if (!email) {
      errors.push('Email is required.');
    } else if (!emailRegex.test(email.toString().trim())) {
      errors.push('Invalid email address format.');
    }
    if (!department) errors.push('Department is required.');
    if (!role) {
      errors.push('Role is required.');
    } else {
      const roleStr = role.toString().trim().toLowerCase();
      if (!['student', 'faculty', 'admin', 'super admin'].includes(roleStr)) {
        errors.push("Role must be 'student', 'faculty', or 'admin'.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const processFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      toast.error('Invalid file format. Please upload an Excel (.xlsx) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          toast.error('The uploaded file is empty.');
          setIsProcessing(false);
          return;
        }

        // Standardize and validate rows
        const validated: ParsedUser[] = rawJson.map((row) => {
          const { isValid, errors } = validateUser(row);
          return {
            Name: (row.Name || row.name || row.FullName || row['Full Name'] || '').toString().trim(),
            Email: (row.Email || row.email || row.EmailAddress || row['Email Address'] || '').toString().trim().toLowerCase(),
            Department: (row.Department || row.department || '').toString().trim(),
            Role: (row.Role || row.role || '').toString().trim(),
            Course: (row.Course || row.course || '').toString().trim(),
            Semester: (row.Semester || row.semester || '').toString().trim(),
            Phone: (row.Phone || row.phone || '').toString().trim(),
            isValid,
            errors
          };
        });

        setParsedData(validated);
        toast.success(`Successfully parsed ${validated.length} rows.`);
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse file. Please verify structure.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    const validUsers = parsedData.filter(u => u.isValid);
    if (validUsers.length === 0) {
      toast.error('No valid user records to import.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post('/admin/users/bulk', { users: validUsers });
      if (response.data.success) {
        toast.success(`Import complete! Successfully created ${response.data.importedCount} users.`);
        setCredentials(response.data.credentials);
        onImportComplete();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadExcel = () => {
    if (!credentials) return;
    try {
      const worksheet = XLSX.utils.json_to_sheet(credentials);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Credentials');
      XLSX.writeFile(workbook, 'university_portal_credentials.xlsx');
      toast.success('Spreadsheet downloaded!');
    } catch (e) {
      toast.error('Excel generation failed.');
    }
  };

  const downloadCSV = () => {
    if (!credentials) return;
    try {
      const worksheet = XLSX.utils.json_to_sheet(credentials);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'university_portal_credentials.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV downloaded!');
    } catch (e) {
      toast.error('CSV generation failed.');
    }
  };

  const downloadPDF = () => {
    if (!credentials) return;
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('University Portal - Generated Credentials', 14, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Please store these credentials securely. Passwords cannot be recovered after hashing.', 14, 28);
      
      let y = 40;
      doc.setFont('helvetica', 'bold');
      doc.text('Name', 14, y);
      doc.text('Email', 60, y);
      doc.text('Role', 130, y);
      doc.text('Password', 160, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      credentials.forEach((c: any) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(c.Name || c.name || '', 14, y);
        doc.text(c.Email || c.email || '', 60, y);
        doc.text(c.Role || c.role || '', 130, y);
        doc.text(c.Password || c.password || '', 160, y);
        y += 8;
      });
      doc.save('university_portal_credentials.pdf');
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('PDF generation failed.');
    }
  };

  const totalRows = parsedData.length;
  const validRows = parsedData.filter(u => u.isValid).length;
  const invalidRows = totalRows - validRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-4xl p-6 md:p-8 flex flex-col max-h-[90vh] shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🧙‍♂️</span> Bulk User Import Wizard
            </h2>
            <p className="text-xs text-white/40">Upload a spreadsheet containing pre-approved student or faculty accounts</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white/80 transition-colors p-1 bg-white/5 rounded-lg border border-white/5"
            disabled={isImporting}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success / Download Modal view */}
        {credentials ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center py-6 space-y-6">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xl rounded-full flex items-center justify-center animate-bounce">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Import and Password Generation Complete!</h3>
              <p className="text-xs text-white/60 max-w-md mx-auto mt-2">
                Plaintext passwords have been generated for these accounts. Download them now. They are not stored and cannot be retrieved later.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
              <button 
                onClick={downloadExcel} 
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</span>
                <span className="text-xs font-semibold text-white">Excel Spreadsheet</span>
              </button>
              <button 
                onClick={downloadCSV} 
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📄</span>
                <span className="text-xs font-semibold text-white">CSV File</span>
              </button>
              <button 
                onClick={downloadPDF} 
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📕</span>
                <span className="text-xs font-semibold text-white">PDF Document</span>
              </button>
            </div>

            <button onClick={onClose} className="btn-primary px-8 py-2.5">
              Done & Close
            </button>
          </div>
        ) : (
          <>
            {/* Main Upload / Review view */}
            {!file ? (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-white/15 hover:border-primary-500/50 bg-white/[0.02] hover:bg-primary-500/[0.02] rounded-2xl py-14 px-6 cursor-pointer transition-all text-center group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                <span className="text-4xl mb-4 group-hover:-translate-y-1.5 transition-transform duration-300">📁</span>
                <p className="text-sm font-semibold text-white">Drag & drop your Excel or CSV file here</p>
                <p className="text-xs text-white/40 mt-1">or click to browse local files (.xlsx, .xls, .csv)</p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] text-white/35 font-mono">
                  <span>Required Headers: Name, Email, Department, Role</span>
                  <span>|</span>
                  <span>Optional Headers: Course, Semester, Phone</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Stats Bar */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 mb-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white/55">File: <strong className="text-white">{file.name}</strong></span>
                    <button 
                      onClick={() => { setFile(null); setParsedData([]); }} 
                      className="text-primary-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/60">Total: <strong className="text-white">{totalRows}</strong></span>
                    <span className="text-emerald-400 font-bold">Valid: {validRows}</span>
                    {invalidRows > 0 && <span className="text-red-400 font-bold">Invalid: {invalidRows}</span>}
                  </div>
                </div>

                {/* Previews Table */}
                <div className="flex-1 overflow-auto border border-white/10 rounded-xl min-h-[220px]">
                  {isProcessing ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/40 gap-2">
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Parsing rows...
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#161a22] text-white/60 font-semibold border-b border-white/10 z-10">
                        <tr>
                          <th className="p-3">Status</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Course</th>
                          <th className="p-3">Sem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {parsedData.map((user, idx) => (
                          <tr key={idx} className={`hover:bg-white/[0.02] ${!user.isValid ? 'bg-red-500/[0.03]' : ''}`}>
                            <td className="p-3">
                              {user.isValid ? (
                                <span className="text-emerald-400 font-bold" title="Valid">✓</span>
                              ) : (
                                <span 
                                  className="text-red-400 font-bold cursor-help" 
                                  title={user.errors.join(' ')}
                                >
                                  ✗
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-medium text-white truncate max-w-[150px]">{user.Name || '-'}</td>
                            <td className="p-3 font-mono text-white/80 truncate max-w-[180px]">{user.Email || '-'}</td>
                            <td className="p-3 capitalize text-white/70">{user.Role || '-'}</td>
                            <td className="p-3 text-white/70 truncate max-w-[120px]">{user.Department || '-'}</td>
                            <td className="p-3 font-mono text-white/70">{user.Course || '-'}</td>
                            <td className="p-3 text-white/70">{user.Semester || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Import Buttons */}
                <div className="flex justify-end gap-3 mt-6 border-t border-white/10 pt-4">
                  <button 
                    onClick={() => { setFile(null); setParsedData([]); }} 
                    className="btn-secondary px-6"
                    disabled={isImporting}
                  >
                    Clear File
                  </button>
                  <button 
                    onClick={handleImport} 
                    disabled={isImporting || isProcessing || validRows === 0}
                    className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing & Generating...
                      </>
                    ) : (
                      `Import ${validRows} Verified Accounts`
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};
