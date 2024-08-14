import * as React from 'react';

import { Box, Button, IconButton, ListDivider, ListItem, ListItemDecorator, MenuItem, SvgIcon, Typography } from '@mui/joy';
import ClearIcon from '@mui/icons-material/Clear';
import CodeIcon from '@mui/icons-material/Code';

import type { LiveFileId, LiveFileMetadata } from '~/common/livefile/liveFile.types';
import { CloseableMenu } from '~/common/components/CloseableMenu';
import { LiveFileChooseIcon } from '~/common/livefile/liveFile.icons';
import { LiveFilePatchIcon } from '~/common/components/icons/LiveFilePatchIcon';
import { TooltipOutlined } from '~/common/components/TooltipOutlined';
import { getFirstFileSystemFileHandle } from '~/common/util/fileSystemUtils';
import { useDragDropDataTransfer } from '~/common/components/useDragDropDataTransfer';

import type { DWorkspaceId } from './workspace.types';
import { useContextWorkspaceId } from './WorkspaceIdProvider';
import { useWorkspaceContentsMetadata } from './useWorkspaceContentsMetadata';


// configuration
const ENABLE_AUTO_WORKSPACE_PICK = false;


/**
 * Allows selection of LiveFiles in the current Workspace
 */
export function WorkspaceLiveFilePicker(props: {
  allowRemove?: boolean;
  autoSelectName: string | null;
  labelButton: string;
  labelTooltip?: string;
  liveFileId: LiveFileId | null;
  onSelectLiveFile: (id: LiveFileId | null) => void;
  onSelectFileOpen?: (workspaceId: DWorkspaceId | null) => Promise<void>;
  onSelectFileSystemFileHandle?: (workspaceId: DWorkspaceId | null, fsHandle: FileSystemFileHandle) => Promise<void>;
}) {

  // state for anchor
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

  // external state
  const workspaceId = useContextWorkspaceId();
  const { liveFilesMetadata: wLiveFiles } = useWorkspaceContentsMetadata(workspaceId);

  // set as disabled when empty
  const haveLiveFiles = wLiveFiles.length > 0;
  const { autoSelectName, liveFileId, onSelectLiveFile, onSelectFileOpen, onSelectFileSystemFileHandle } = props;


  // [effect] auto-select a LiveFileId
  React.useEffect(() => {
    if (!ENABLE_AUTO_WORKSPACE_PICK || !haveLiveFiles || !wLiveFiles.length)
      return;

    if (wLiveFiles.length === 1) {
      // auto-select the only LiveFile
      onSelectLiveFile(wLiveFiles[0].id);
    } else {
      // auto-select by name
      const lfm = wLiveFiles.find(lfm => lfm.name === autoSelectName);
      if (lfm)
        onSelectLiveFile(lfm.id);
    }
  }, [haveLiveFiles, wLiveFiles, autoSelectName, onSelectLiveFile]);


  // handlers

  const handleToggleMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault(); // added for the Right mouse click (to prevent the menu)
    setMenuAnchor(anchor => anchor ? null : event.currentTarget);
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleSelectLiveFile = React.useCallback((id: LiveFileId | null) => {
    setMenuAnchor(null);
    onSelectLiveFile(id);
  }, [onSelectLiveFile]);

  const handleSelectNewFile = React.useCallback(async () => {
    if (onSelectFileOpen) {
      setMenuAnchor(null);
      await onSelectFileOpen(workspaceId);
    }
  }, [onSelectFileOpen, workspaceId]);

  const handleDataTransferDrop = React.useCallback(async (dataTransfer: DataTransfer) => {
    if (onSelectFileSystemFileHandle) {
      const fsfHandle = await getFirstFileSystemFileHandle(dataTransfer);
      if (fsfHandle) {
        setMenuAnchor(null);
        await onSelectFileSystemFileHandle(workspaceId, fsfHandle);
      }
    }
  }, [onSelectFileSystemFileHandle, workspaceId]);

  const { dragContainerSx, dropComponent, handleContainerDragEnter, handleContainerDragStart } =
    useDragDropDataTransfer(true, 'Select', LiveFileChooseIcon as typeof SvgIcon, 'startDecorator', true, handleDataTransferDrop);


  // Note: in the future let this be, we can show a file picker that adds LiveFiles to the workspace
  // if (!haveLiveFiles)
  //   return null;

  const showRemove = !!liveFileId && props.allowRemove === true;

  return <>

    {/* Main Button, also a drop target */}
    <Box
      onDragEnter={handleContainerDragEnter}
      onDragStart={handleContainerDragStart}
      sx={dragContainerSx}
    >
      {liveFileId && (
        <IconButton
          color='success'
          size='sm'
          onClick={handleToggleMenu}
        >
          <LiveFilePatchIcon color='success' />
        </IconButton>
      )}

      {!liveFileId && (
        <TooltipOutlined title={props.labelTooltip} color='success' placement='top-end'>
          <Button
            variant='plain'
            color='neutral'
            size='sm'
            onClick={handleToggleMenu}
            endDecorator={<LiveFileChooseIcon />}
            // endDecorator={<LiveFilePatchIcon color='success' />}
          >
            {props.labelButton}
          </Button>
        </TooltipOutlined>
      )}

      {dropComponent}
    </Box>


    {/* Select/Upload file menu */}
    {!!menuAnchor && (
      <CloseableMenu
        open
        anchorEl={menuAnchor}
        onClose={handleCloseMenu}
        noTopPadding
        noBottomPadding
        placement='bottom-start'
        sx={{ minWidth: 240 }}
      >

        {/* Workspace Files (if any) */}
        <ListItem>
          <Typography level='body-sm'>Select Target:</Typography>
        </ListItem>

        {haveLiveFiles && wLiveFiles.map((lfm: LiveFileMetadata) => (
          <MenuItem
            key={lfm.id}
            selected={lfm.id === liveFileId}
            onClick={() => handleSelectLiveFile(lfm.id)}
            sx={{ border: 'none' }}
          >
            <ListItemDecorator><CodeIcon sx={{ fontSize: 'lg' }} /></ListItemDecorator>
            <Box sx={{ fontSize: 'sm' }}>
              {lfm.name}
              <Box component='span' sx={{ fontSize: 'xs', display: 'block', color: 'text.tertiary' }}>
                {lfm.size?.toLocaleString() || '(unknown)'} bytes {lfm.type ? `· ${lfm.type}` : ''}
              </Box>
            </Box>
          </MenuItem>
        ))}

        {/* Pair a new file */}
        {!!props.onSelectFileOpen && (
          <MenuItem onClick={handleSelectNewFile} sx={haveLiveFiles ? { minHeight: '3rem' } : undefined}>
            <ListItemDecorator>
              <LiveFileChooseIcon />
            </ListItemDecorator>
            Other target file...
          </MenuItem>
        )}

        {/* Remove pairing */}
        {showRemove && <ListDivider />}
        {showRemove && (
          <MenuItem disabled={!liveFileId} onClick={() => handleSelectLiveFile(null)}>
            <ListItemDecorator><ClearIcon /></ListItemDecorator>
            Remove
          </MenuItem>
        )}

      </CloseableMenu>
    )}

  </>;
}