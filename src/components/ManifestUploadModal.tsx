import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ManifestValidationResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  X,
  HelpCircle,
  Ship,
} from 'lucide-react';

interface ManifestUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManifestUploadModal: React.FC<ManifestUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [vesselName, setVesselName] = useState<string>('');
  const [existingVessels, setExistingVessels] = useState<string[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ManifestValidationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      ApiService.getVessels(false, user)
        .then((list) => {
          const names = Array.from(new Set(list.map((v) => v.name?.trim()).filter(Boolean)));
          setExistingVessels(names);
          if (names.length > 0 && !vesselName) {
            setVesselName(names[0]);
          }
        })
        .catch(console.warn);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setFileName('');
    setValidationResult(null);
    setIsProcessing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Helper to parse file
  const processUploadedFile = async (selectedFile: File) => {
    const cleanVesselName = vesselName.trim().toUpperCase();
    if (!cleanVesselName) {
      showError('Please write the Marine Vessel Name before uploading the manifest.');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rawJson.length < 2) {
        throw new Error('Manifest file is empty or has no data rows.');
      }

      // Find header row indices
      const headerRow = rawJson[0].map((h: any) => String(h || '').trim().toLowerCase());

      const serialIdx = headerRow.findIndex(
        (h: string) =>
          h.includes('serial') ||
          h.includes('s/n') ||
          h.includes('sn') ||
          h.includes('sr') ||
          h.includes('item') ||
          h === 'no' ||
          h === '#' ||
          h === 'no.' ||
          h === 's.no' ||
          h === 'sr.no'
      );
      const chassisIdx = headerRow.findIndex(
        (h: string) =>
          h.includes('chassis') ||
          h.includes('chasis') ||
          h.includes('vin') ||
          h.includes('frame') ||
          h.includes('chassis no') ||
          h.includes('chassis number')
      );
      const descIdx = headerRow.findIndex(
        (h: string) =>
          h.includes('desc') ||
          h.includes('make') ||
          h.includes('model') ||
          h.includes('vehicle') ||
          h.includes('type') ||
          h.includes('car')
      );
      const vesselIdx = headerRow.findIndex(
        (h: string) => h.includes('vessel') || h.includes('ship') || h.includes('marine')
      );
      const voyageIdx = headerRow.findIndex(
        (h: string) => h.includes('voyage') || h.includes('voy')
      );

      // Verify mandatory columns in header
      if (serialIdx === -1 && chassisIdx === -1) {
        throw new Error(
          "Missing mandatory columns: Excel file must include 'Serial Number' (S/N, No) and 'Chassis Number' (VIN, Frame) columns."
        );
      }
      if (serialIdx === -1) {
        throw new Error(
          "Missing mandatory column: 'Serial Number' (or S/N, No) column was not found in the Excel file headers."
        );
      }
      if (chassisIdx === -1) {
        throw new Error(
          "Missing mandatory column: 'Chassis Number' (or VIN, Frame No) column was not found in the Excel file headers."
        );
      }

      // Extract rows
      const effectiveVessel = cleanVesselName;
      const effectiveVoyage = 'VOY-GENERAL';

      const rowsToValidate: any[] = [];
      for (let i = 1; i < rawJson.length; i++) {
        const row = rawJson[i];
        if (!row || row.length === 0) continue;

        const rawSerial = row[serialIdx] !== undefined && row[serialIdx] !== null ? String(row[serialIdx]).trim() : '';
        const serialVal = rawSerial !== '' ? rawSerial : `${i}`;
        const chassisVal = row[chassisIdx] !== undefined && row[chassisIdx] !== null ? String(row[chassisIdx]).trim().toUpperCase() : '';
        // Description is optional: if not present in header or cell is empty, default to 'N/A'
        const descVal = descIdx !== -1 && row[descIdx] !== undefined && row[descIdx] !== null && String(row[descIdx]).trim() !== ''
          ? String(row[descIdx]).trim()
          : 'N/A';
        const rowVessel = vesselIdx !== -1 && row[vesselIdx] ? String(row[vesselIdx]).trim().toUpperCase() : effectiveVessel;
        const rowVoyage = voyageIdx !== -1 && row[voyageIdx] ? String(row[voyageIdx]).trim().toUpperCase() : effectiveVoyage;

        if (!chassisVal && !rawSerial) continue; // skip completely empty trailing rows

        rowsToValidate.push({
          serialNumber: serialVal,
          chassisNumber: chassisVal,
          description: descVal,
          vesselName: rowVessel || effectiveVessel,
          voyageNumber: rowVoyage || effectiveVoyage,
        });
      }

      if (rowsToValidate.length === 0) {
        throw new Error('No valid vehicle rows found in file.');
      }

      // Send to server validation endpoint
      const validation = await ApiService.validateManifest(
        rowsToValidate,
        { vesselName: effectiveVessel, voyageNumber: effectiveVoyage },
        user
      );

      setValidationResult({
        fileName: selectedFile.name,
        total: validation.total,
        validCount: validation.validCount,
        duplicateCount: validation.duplicateCount,
        invalidCount: validation.invalidCount,
        rows: validation.preview,
      });
    } catch (err: any) {
      showError(err.message || 'Failed to process manifest file');
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Import Action
  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validCount === 0) return;
    const finalVessel = vesselName.trim().toUpperCase();
    if (!finalVessel) {
      showError('Please enter a Marine Vessel Name before importing.');
      return;
    }

    setIsImporting(true);

    try {
      const validRows = validationResult.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          serialNumber: r.serialNumber,
          chassisNumber: r.chassisNumber,
          description: r.description,
          vesselName: r.vesselName || finalVessel,
          voyageNumber: r.voyageNumber || 'VOY-GENERAL',
        }));

      await ApiService.importManifest(
        validationResult.fileName,
        validRows,
        {
          vesselName: finalVessel,
          voyageNumber: 'VOY-GENERAL',
          portOfDischarge: 'Dar es Salaam Port (TPA)',
          isVisibleInOperations: true,
        },
        user
      );

      showSuccess(
        `Manifest for ${finalVessel} successfully imported! ${validRows.length} vehicles registered with status AT PORT.`
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      showError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Download Sample Templates
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      { 'Serial Number': 1, 'Chassis Number': 'KEEFW108999', Description: 'MAZDA CX-5 2.0L' },
      { 'Serial Number': 2, 'Chassis Number': 'JH4TB2H26CC000123', Description: 'HONDA CR-V 4WD' },
      { 'Serial Number': 3, 'Chassis Number': 'KMHFG4JG5GA123456', Description: 'HYUNDAI TUCSON' },
      { 'Serial Number': 4, 'Chassis Number': 'ZVW30-1849201', Description: '' }, // Description optional
      { 'Serial Number': 5, 'Chassis Number': 'WBAYU71020EE99881', Description: 'BMW X3 XDRIVE' },
      { 'Serial Number': 6, 'Chassis Number': 'NZE161-5509123', Description: '' }, // Description optional
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manifest');
    XLSX.writeFile(wb, `Sample_Manifest.xlsx`);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Serial Number,Chassis Number,Description\n' +
      '1,KEEFW108999,MAZDA CX-5 2.0L\n' +
      '2,JH4TB2H26CC000123,HONDA CR-V 4WD\n' +
      '3,KMHFG4JG5GA123456,\n' +
      '4,ZVW30-1849201,TOYOTA PRIUS HYBRID\n' +
      '5,WBAYU71020EE99881,\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Sample_Manifest.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Manifest Upload</h3>
                <p className="text-xs text-slate-400">Import vehicle intake manifest</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Marine Vessel Name Requirement Form */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Ship className="w-4 h-4 text-blue-600" />
                  <span>Marine Vessel Name</span>
                  <span className="text-rose-600 font-bold">* (Required)</span>
                </label>
                {vesselName && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Auto-Registered & Active
                  </span>
                )}
              </div>
              <div>
                <input
                  type="text"
                  required
                  list="existing-vessels-list"
                  placeholder="Enter vessel name, e.g. MV HOEGH TRAPPER, MV GRANDE NIGERIA"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm font-bold bg-white border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 uppercase tracking-wide shadow-2xs"
                />
                <datalist id="existing-vessels-list">
                  {existingVessels.map((v, idx) => (
                    <option key={`opt-vsl-${v}-${idx}`} value={v} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-500 mt-1">
                  Vehicles from this vessel will instantly be registered at port and immediately increase your operational counts.
                </p>
              </div>
            </div>

            {!validationResult ? (
              <>
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    Upload manifest
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    Supports Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) and Comma-Separated Values (<strong>.csv</strong>)
                  </p>

                  <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-xs font-medium">
                    <span>Columns:</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      Serial Number * (Compulsory)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      Chassis Number * (Compulsory)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      Description (Optional)
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="py-6 text-center text-sm text-slate-600">
                    <div className="inline-block animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full mb-2" />
                    <p>Validating manifest rows, verifying columns & checking duplicate chassis numbers...</p>
                  </div>
                )}

                {/* Sample Template Downloads */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Need a formatted template with sample data?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSampleExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Sample Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Sample CSV (.csv)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Validation Preview State */
              <div className="space-y-5">
                {/* Summary Scorecard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Records
                    </span>
                    <span className="text-xl font-bold text-slate-900">{validationResult.total}</span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid to Import
                    </span>
                    <span className="text-xl font-bold text-emerald-900">{validationResult.validCount}</span>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Duplicates
                    </span>
                    <span className="text-xl font-bold text-amber-900">{validationResult.duplicateCount}</span>
                  </div>
                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Invalid
                    </span>
                    <span className="text-xl font-bold text-rose-900">{validationResult.invalidCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>
                      File: <strong className="text-slate-900">{validationResult.fileName}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setValidationResult(null);
                      setFile(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Upload a different file
                  </button>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between border-b border-slate-200">
                    <span>Manifest Row Preview</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Showing {validationResult.rows.length} rows
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">S/N</th>
                          <th className="py-2 px-3">Chassis Number</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Validation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validationResult.rows.map((row, idx) => (
                          <tr
                            key={`val-row-${row.serialNumber || idx}-${row.chassisNumber || ''}-${idx}`}
                            className={
                              row.isValid
                                ? 'bg-white hover:bg-slate-50'
                                : row.isDuplicate
                                ? 'bg-amber-50/50'
                                : 'bg-rose-50/50'
                            }
                          >
                            <td className="py-2 px-3 text-slate-600 font-medium">{row.serialNumber}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {row.chassisNumber || <span className="text-rose-500 italic">Missing</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{row.description || '—'}</td>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : row.isDuplicate ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800"
                                  title={row.errorMessage}
                                >
                                  <AlertTriangle className="w-3 h-3" /> Duplicate
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800"
                                  title={row.errorMessage}
                                >
                                  <XCircle className="w-3 h-3" /> {row.errorMessage || 'Invalid'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic">
                  Note: All valid vehicles will be registered and assigned initial status <strong>AT PORT</strong>. Duplicates and invalid rows will be safely excluded.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              Cancel
            </button>

            {validationResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || validationResult.validCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all"
              >
                {isImporting ? (
                  <span>Importing into Database...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Import ({validationResult.validCount} Vehicles)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
