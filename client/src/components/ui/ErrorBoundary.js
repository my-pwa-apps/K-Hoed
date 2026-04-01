import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback)
                return this.props.fallback;
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gray-50", children: _jsxs("div", { className: "max-w-sm w-full text-center space-y-4", children: [_jsx(AlertTriangle, { size: 48, className: "mx-auto text-amber-500" }), _jsx("h1", { className: "font-display font-bold text-2xl text-gray-900", children: "Something went wrong" }), _jsx("p", { className: "text-gray-500 text-sm", children: this.state.error?.message ?? "An unexpected error occurred." }), _jsxs("button", { onClick: () => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }, className: "inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors", children: [_jsx(RefreshCw, { size: 14 }), "Reload page"] })] }) }));
        }
        return this.props.children;
    }
}
