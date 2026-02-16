import { Button } from '@402systems/core-ui/components/ui/button';
import { Kbd } from '@402systems/core-ui/components/ui/kbd';
import { Download, Share2, Printer, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BoardControlsProps {
  isPreview: boolean;
  isLoadingBoard: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isUserAuthenticated: boolean;
  isUserLoading: boolean;
  onSetPreview: (isPreview: boolean) => void;
  onShuffle: () => void;
  onSave: () => void;
  onDownloadImage: () => void;
  onShareImage: () => void;
  onPrint: () => void;
}

export function BoardControls({
  isPreview,
  isLoadingBoard,
  isSaving,
  saveStatus,
  isUserAuthenticated,
  isUserLoading,
  onSetPreview,
  onShuffle,
  onSave,
  onDownloadImage,
  onShareImage,
  onPrint,
}: BoardControlsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={isPreview ? 'outline' : 'default'}
            onClick={() => onSetPreview(false)}
            className="relative"
          >
            Edit Board
          </Button>
          <Button
            variant={isPreview ? 'default' : 'outline'}
            onClick={() => onSetPreview(true)}
          >
            Preview <Kbd className="ml-2">Ctrl+P</Kbd>
          </Button>
          <Button
            variant={'outline'}
            onClick={onShuffle}
            disabled={isLoadingBoard}
          >
            Shuffle <Kbd className="ml-2">Ctrl+Shift+S</Kbd>
          </Button>
          {isUserAuthenticated && (
            <Button
              variant={saveStatus === 'saved' ? 'default' : 'outline'}
              onClick={onSave}
              disabled={isSaving || isLoadingBoard}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === 'saved' ? (
                'Saved!'
              ) : saveStatus === 'error' ? (
                'Save Failed'
              ) : (
                <>
                  Save <Kbd className="ml-2">Ctrl+S</Kbd>
                </>
              )}
            </Button>
          )}
        </div>
        {!isUserAuthenticated && !isUserLoading && (
          <p className="mt-2 text-center text-sm text-slate-500">
            <Link href="/" className="underline">
              Sign in
            </Link>{' '}
            to save your board
          </p>
        )}
      </div>

      {isPreview && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onDownloadImage} variant="secondary" size="lg">
            <Download className="mr-2 h-4 w-4" /> Download PNG
          </Button>
          <Button onClick={onShareImage} variant="secondary" size="lg">
            <Share2 className="mr-2 h-4 w-4" /> Share Board
          </Button>
          <Button onClick={onPrint} variant="outline" size="lg">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      )}
    </>
  );
}
