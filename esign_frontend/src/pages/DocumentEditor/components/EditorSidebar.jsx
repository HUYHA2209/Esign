import React from 'react';

const EditorSidebar = ({ steps, currentStep, goToStep, quickActions, handleBackNavigation }) => {
    return (
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-4 border-b">
                <h3 className="flex items-end justify-between text-sm font-semibold text-slate-900">
                    Trình chỉnh sửa tài liệu
                    <span className="ml-2 rounded border bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Step {currentStep}/3</span>
                </h3>
                <div className="relative my-4 h-1 rounded-md bg-slate-100">
                    <div className="absolute inset-y-0 left-0 bg-indigo-600" style={{ width: `${(currentStep / 3) * 100}%` }} />
                </div>
                <div className="space-y-3">
                    {steps.map(s => (
                        <div key={s.id} onClick={() => goToStep(s.id)} className={`cursor-pointer rounded-lg p-3 transition-colors border ${currentStep === s.id ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <div className="flex items-center space-x-3">
                                <div className="rounded border p-2 border-gray-100 bg-gray-100">
                                    <s.icon className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <div className={`text-sm font-medium ${currentStep === s.id ? 'text-indigo-700' : 'text-slate-900'}`}>{s.title}</div>
                                    <div className="text-xs text-slate-500">{s.description}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 flex-1">
                <h4 className="text-sm font-semibold mb-2 text-slate-700">Quick Actions</h4>
                <div className="space-y-2">
                    {quickActions.map((a, i) => (
                        <button key={i} onClick={a.onClick} className="inline-flex items-center text-sm font-medium h-9 px-3 rounded-md w-full justify-start hover:bg-slate-50">
                            <a.icon className="mr-2 h-4 w-4" />
                            {a.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4">
                <button onClick={handleBackNavigation} className="inline-flex items-center rounded-md text-sm font-medium h-10 py-2 px-4 w-full justify-start hover:bg-slate-50">
                    Quay lại tài liệu
                </button>
            </div>
        </aside>
    );
};

export default EditorSidebar;
