import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface AuditLogDetailModalProps {
  open: boolean;
  log: any;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  open,
  log,
  onClose
}) => {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dettaglio Azione: {log.action_type}
            <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'}>
              {log.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Visualizza tutti i dettagli tecnici e le modifiche relative a questa azione registrata nel sistema.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Info generali */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data/Ora</p>
              <p>{format(new Date(log.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: it })}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Utente</p>
              <p>{log.user_email || 'Sistema'}</p>
              <p className="text-xs text-muted-foreground">
                Ruolo: {log.user_role || 'N/A'} | ID: {log.user_id || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Categoria / Azione</p>
              <p>{log.action_category} / {log.action_type}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Entità</p>
              <p>
                {log.entity_type ? `${log.entity_type}: ${log.entity_name || log.entity_id}` : 'N/A'}
              </p>
            </div>

            <div className="col-span-1 md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Descrizione</p>
              <p>{log.action_description}</p>
            </div>

            <Separator className="col-span-1 md:col-span-2 my-2" />

            {/* Info tecnica */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP Address</p>
              <p className="font-mono text-sm">{log.ip_address}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Request</p>
              <p className="font-mono text-sm">{log.request_method} {log.request_path}</p>
            </div>

            <div className="col-span-1 md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">User Agent</p>
              <p className="font-mono text-sm break-all">{log.user_agent}</p>
            </div>

            {/* Diff old/new value */}
            {(log.old_value || log.new_value) && (
              <div className="col-span-1 md:col-span-2">
                <Separator className="my-2" />
                <h3 className="text-lg font-semibold mb-2">Modifiche</h3>
                <div className="border rounded-md overflow-hidden">
                  <ReactDiffViewer
                    oldValue={JSON.stringify(log.old_value || {}, null, 2)}
                    newValue={JSON.stringify(log.new_value || {}, null, 2)}
                    splitView={true}
                    leftTitle="Prima"
                    rightTitle="Dopo"
                    useDarkTheme={false}
                    styles={{
                      variables: {
                        light: {
                          diffViewerBackground: '#fff',
                          gutterBackground: '#f9fafb',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="col-span-1 md:col-span-2">
                <Separator className="my-2" />
                <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                <div className="bg-muted p-4 rounded-md overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Errore */}
            {log.error_message && (
              <div className="col-span-1 md:col-span-2">
                <Separator className="my-2" />
                <h3 className="text-lg font-semibold mb-2 text-destructive">Errore</h3>
                <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                  {log.error_message}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
