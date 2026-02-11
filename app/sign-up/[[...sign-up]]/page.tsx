import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <div
                        className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl
                        bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200"
                    >
                        <span className="text-2xl">🚑</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Station-Navet</h1>
                    <p className="text-sm text-slate-500">Skapa ditt konto</p>
                </div>
                <SignUp />
            </div>
        </div>
    );
}
