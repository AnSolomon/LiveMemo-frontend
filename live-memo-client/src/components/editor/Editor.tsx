import React, { useRef, useCallback, useState, useEffect } from 'react';
import { RemirrorJSON } from 'remirror';
import { YjsExtension, AnnotationExtension } from 'remirror/extensions';
import {
    EditorComponent,
    Remirror,
    ThemeProvider,
    useRemirror,
} from '@remirror/react';
import { ProsemirrorDevTools } from '@remirror/dev';
import { useDebouncedCallback } from 'use-debounce';
import useCurrentUser from '../hooks/useCurrentUser';
import useWebRtcProvider from '../hooks/useWebRtcProvider';
import useObservableListener from '../hooks/useObservableListener';
import FloatingAnnotations from './FloatingAnnotations';
import AnnotationsJSONPrinter from './AnnotationsJSONPrinter';
import 'remirror/styles/all.css';

interface EditorProps {
    documentId: string;
    onFetch: Function;
    onSave: Function;
}

const TIMEOUT = 3000 + Math.floor(Math.random() * 7000);

const Status = ({ success = false }) => (
    <span className={`status ${success ? 'success' : ''}`}>&nbsp;</span>
);

function Editor({ documentId, onFetch, onSave, }: EditorProps) {
    const usedFallbackRef = useRef<boolean>(false);
    const currentUser = useCurrentUser();
    const provider = useWebRtcProvider(currentUser, documentId);
    const [clientCount, setClientCount] = useState<number>(0);
    const [isSynced, setIsSynced] = useState<boolean>(false);
    const [docState, setDocState] = useState<RemirrorJSON>();



    const handleChange = useCallback(
        ({ state, tr, content }) => {

            //state 는 현재 editstate 뜸 tr은  트랜잭션 tr은 editstate 안에도 있음 
            if (tr?.docChanged) {
                setDocState(state.toJSON().doc);
            }
        },
        [setDocState],
    );



    const handleSave = useCallback(
        newDocState => {
            console.log("make")
            if (isSynced || clientCount === 0) {
                onSave(documentId, JSON.stringify(newDocState));
                const meta = provider.doc.getMap('meta');
                meta.set('lastSaved', Date.now());
                console.log(meta)
            }
        },
        [onSave, documentId, provider.doc, isSynced, clientCount],
    );

    useEffect(() => {
        console.log("first me")
        handleSave(docState)

    }, [])

    const handleSaveDebounced = useDebouncedCallback(handleSave, TIMEOUT);

    const handlePeersChange = useCallback(
        ({ webrtcPeers }) => {
            setClientCount(webrtcPeers.length);
        },
        [setClientCount],
    );
    useObservableListener('peers', handlePeersChange, provider);

    const handleSynced = useCallback(
        ({ synced }) => {
            setIsSynced(synced);
        },
        [setIsSynced],
    );

    useObservableListener('synced', handleSynced, provider);

    useEffect(() => {
        handleSaveDebounced(docState);
    }, [handleSaveDebounced, docState]);

    const handleYDocUpdate = useCallback(() => {
        handleSaveDebounced.cancel();
    }, [handleSaveDebounced]);

    useObservableListener('update', handleYDocUpdate, provider.doc);

    const createExtensions = useCallback(() => {
        return [
            new YjsExtension({
                getProvider: () => provider,
            }),
            new AnnotationExtension(),
        ];
    }, [provider]);


    //getcontext 는 햔재 remirror 상태 다 들어 있음
    const { manager, getContext } = useRemirror({
        extensions: createExtensions,
    });

    useEffect(() => {
        if (usedFallbackRef.current) return;

        const fetchFallback = async () => {
            console.log("fetch")
            if (provider.connected && clientCount === 0) {
                const res = await onFetch(documentId);
                getContext()?.setContent(JSON.parse(res));
            }
            usedFallbackRef.current = true;
        };

        const timeoutId = window.setTimeout(fetchFallback, 1000);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [onFetch, documentId, provider.connected, clientCount, getContext]);

    return (
        <ThemeProvider>
            <Remirror manager={manager} onChange={handleChange}>

                <EditorComponent />
                <FloatingAnnotations />
                <ProsemirrorDevTools />
                <div className="info-box">
                    <p className="info">Connected clients: {clientCount + 1}</p>
                    <p className="info">
                        Synced: <Status success={isSynced || clientCount === 0} />
                    </p>
                </div>
                <h3>Current annotations</h3>
                <AnnotationsJSONPrinter />
            </Remirror>
        </ThemeProvider>
    );
}

export default Editor;
