const Sidebar = () => {
    return (
        <aside className="flex-1/4 w-[300px] overflow-y-auto bg-gray-100">
            Sidebar
            <div>
                <h2>
                    Sign Document
                </h2>
                <div className="flex flex-col gap-2">
                    <label >
                        Full Name
                    </label>
                    <input className="border p-2 rounded" type="text" />
                </div>
                <div>
                    <label>
                        Signature
                    </label>
                    <div className="border h-32 bg-white rounded">
                    </div>
                </div>
            </div>
            <div>
                <h2>Action</h2>
                <div className="flex flex-col gap-2">
                    <button>Download</button>
                    <button>Reject</button>
                </div>
            </div>
        </aside>
    )
}
export default Sidebar;