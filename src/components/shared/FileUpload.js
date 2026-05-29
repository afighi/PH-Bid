import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { storage } from '../../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { COLORS } from '../../theme';
import { FolderOpen, XCircle, CheckCircle2, FileText, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';

export default function FileUpload({ storagePath, onUploadComplete, maxFiles = 5, accept }) {
  const [files, setFiles] = useState([]);

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map((file) => ({
      file,
      id:       Math.random().toString(36).slice(2),
      progress: 0,
      status:   'uploading',
      url:      null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(({ file, id }) => {
      const storageRef = ref(storage, `${storagePath}/${Date.now()}-${file.name}`);
      const task       = uploadBytesResumable(storageRef, file);

      task.on(
        'state_changed',
        (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: pct } : f));
        },
        () => {
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'error' } : f));
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'done', url } : f));
          onUploadComplete?.({ name: file.name, url, size: file.size, type: file.type });
        }
      );
    });
  }, [storagePath, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles, accept });

  const remove = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? COLORS.primary : COLORS.border}`,
          backgroundColor: isDragActive ? `${COLORS.primary}08` : COLORS.gray50,
          borderRadius: 12,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ marginBottom: 8 }}><FolderOpen size={28} color={COLORS.primary} /></div>
        <p style={{ fontSize: 14, color: isDragActive ? COLORS.primary : COLORS.textMuted, fontWeight: 500, margin: 0 }}>
          {isDragActive ? 'Drop files here!' : 'Drag & drop files, or click to browse'}
        </p>
        <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 6 }}>
          PDF, images, DWG — up to 20MB each (max {maxFiles} files)
        </p>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(({ id, file, progress, status, url }) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: COLORS.gray50, borderRadius: 10, padding: '10px 14px',
              border: `1px solid ${status === 'error' ? COLORS.danger : COLORS.border}`,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{status === 'error' ? <XCircle size={20} color={COLORS.danger} /> : status === 'done' ? <CheckCircle2 size={20} color={COLORS.success} /> : <FileText size={20} color={COLORS.textMuted} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </p>
                <p style={{ fontSize: 11, color: COLORS.textLight, margin: '2px 0 0' }}>{formatFileSize(file.size)}</p>
                {status === 'uploading' && (
                  <div style={{ height: 3, backgroundColor: COLORS.border, borderRadius: 3, marginTop: 6 }}>
                    <div style={{ height: 3, backgroundColor: COLORS.primary, borderRadius: 3, width: `${progress}%`, transition: 'width 0.2s' }} />
                  </div>
                )}
              </div>
              <button onClick={() => remove(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textLight, padding: 4 }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
