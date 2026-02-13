'use client';

export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
    public context: SecurityRuleContext;
    public digest: string;

    constructor(context: SecurityRuleContext) {
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
            {
                operation: context.operation,
                path: context.path,
                requestData: context.requestResourceData,
            },
            null,
            2
        )}`;
        super(message);
        this.name = 'FirestorePermissionError';
        this.context = context;

        // This is to make the error visible in the Next.js development overlay
        this.digest = `${this.name}:${context.path}:${context.operation}`;
    }
}
