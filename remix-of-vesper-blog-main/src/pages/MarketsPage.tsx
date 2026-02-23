import { MapPin, IndianRupee, Package, ArrowRight, Search, Filter } from "lucide-react";

const demands = [
    { id: 1, buyer: "FreshMart Co.", crop: "Organic Wheat", price: "₹3,100 / quintal", quantity: "50 tons", distance: "12 km", rating: 4.8, status: "Open" },
    { id: 2, buyer: "GrainHub", crop: "Basmati Rice", price: "₹3,500 / quintal", quantity: "30 tons", distance: "25 km", rating: 4.5, status: "Open" },
    { id: 3, buyer: "SpiceWorld Exports", crop: "Turmeric", price: "₹13,200 / quintal", quantity: "5 tons", distance: "8 km", rating: 4.9, status: "Closing Soon" },
    { id: 4, buyer: "AgriDirect", crop: "Soybean", price: "₹4,200 / quintal", quantity: "20 tons", distance: "35 km", rating: 4.3, status: "Open" },
    { id: 5, buyer: "NatureFresh", crop: "Organic Onion", price: "₹2,100 / quintal", quantity: "40 tons", distance: "18 km", rating: 4.6, status: "Open" },
    { id: 6, buyer: "CropConnect", crop: "Cotton", price: "₹6,400 / quintal", quantity: "15 tons", distance: "42 km", rating: 4.2, status: "Closing Soon" },
];

const farmerListings = [
    { id: 1, farmer: "Rajesh Patil", crop: "Organic Wheat", quantity: "80 quintals", price: "₹2,900/q", harvest: "Dec 15", location: "Nashik" },
    { id: 2, farmer: "Sunita Devi", crop: "Basmati Rice", quantity: "120 quintals", price: "₹3,400/q", harvest: "Jan 10", location: "Pune" },
    { id: 3, farmer: "Mohan Singh", crop: "Turmeric", quantity: "25 quintals", price: "₹12,800/q", harvest: "Dec 20", location: "Sangli" },
    { id: 4, farmer: "Anil Jadhav", crop: "Cotton", quantity: "45 quintals", price: "₹6,200/q", harvest: "Jan 5", location: "Aurangabad" },
];

const MarketsPage = () => {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Marketplace</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Browse buyer demands and farmer supply listings
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search crops…"
                            className="pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none w-48"
                        />
                    </div>
                    <button className="p-2.5 rounded-xl border border-input hover:bg-secondary transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Buyer Demands */}
            <div>
                <h2 className="text-base font-semibold mb-3">Active Buyer Demands</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {demands.map((d) => (
                        <div key={d.id} className="summary-card flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold">{d.crop}</h3>
                                    <p className="text-sm text-muted-foreground">{d.buyer}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {d.status === "Closing Soon" && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning">
                                            Closing Soon
                                        </span>
                                    )}
                                    <span className="text-xs bg-secondary px-2 py-1 rounded-full font-medium">
                                        ★ {d.rating}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-secondary rounded-lg p-2.5">
                                    <IndianRupee className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs font-semibold">{d.price.split("/")[0]}</p>
                                    <p className="text-[10px] text-muted-foreground">per quintal</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-2.5">
                                    <Package className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs font-semibold">{d.quantity}</p>
                                    <p className="text-[10px] text-muted-foreground">required</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-2.5">
                                    <MapPin className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs font-semibold">{d.distance}</p>
                                    <p className="text-[10px] text-muted-foreground">away</p>
                                </div>
                            </div>
                            <button className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm flex items-center justify-center gap-2">
                                Commit <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Farmer Supply Listings */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4">Available Farmer Supply</h2>
                <div className="space-y-3">
                    {farmerListings.map((f) => (
                        <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{f.crop}</p>
                                <p className="text-xs text-muted-foreground">
                                    {f.farmer} · {f.location} · Harvest: {f.harvest}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-bold">{f.price}</p>
                                    <p className="text-xs text-muted-foreground">{f.quantity}</p>
                                </div>
                                <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-xs flex items-center gap-1">
                                    Buy <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MarketsPage;
