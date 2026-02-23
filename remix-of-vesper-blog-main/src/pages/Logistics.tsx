import { MapPin, Truck, Clock, IndianRupee, Route } from "lucide-react";
import Cubes from "@/components/Cubes";


const transportOptions = [
  { type: "Mini Truck", capacity: "2 tons", cost: "₹1,200", eta: "2 hrs", available: true },
  { type: "Standard Truck", capacity: "8 tons", cost: "₹3,500", eta: "3 hrs", available: true },
  { type: "Large Truck", capacity: "16 tons", cost: "₹6,000", eta: "4 hrs", available: false },
  { type: "Cold Storage Van", capacity: "4 tons", cost: "₹4,500", eta: "3 hrs", available: true },
];

const Logistics = () => {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Logistics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan transport routes and book vehicles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map placeholder */}
        <div className="summary-card overflow-hidden">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Route Preview
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ height: '300px', position: 'relative', background: '#0a1a0f' }}>
            <Cubes
              gridSize={8}
              maxAngle={40}
              radius={3}
              borderStyle="1px solid rgba(74,163,92,0.35)"
              faceColor="#0a1a0f"
              rippleColor="#4aa35c"
              rippleSpeed={1.8}
              autoAnimate
              rippleOnClick
              cellGap={4}
            />
            <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
              <p className="text-xs text-primary/70 font-medium">Click to simulate route ripple</p>
            </div>
          </div>
        </div>


        {/* Route estimation */}
        <div className="summary-card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Route Estimation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-4">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-semibold">Farm, Nashik</p>
              </div>
            </div>
            <div className="ml-5 border-l-2 border-dashed border-border h-6" />
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-4">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-semibold">FreshMart Warehouse, Pune</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-muted rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-bold">3h 15m</p>
                <p className="text-[10px] text-muted-foreground">Duration</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-bold">168 km</p>
                <p className="text-[10px] text-muted-foreground">Distance</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <IndianRupee className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-bold">₹3,500</p>
                <p className="text-[10px] text-muted-foreground">Est. Cost</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport options */}
      <div className="summary-card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          Available Transport Options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {transportOptions.map((opt, i) => (
            <div
              key={i}
              className={`bg-secondary/50 rounded-xl p-4 border ${opt.available ? "border-border" : "border-border opacity-50"
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{opt.type}</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.available
                    ? "bg-status-success/10 text-status-success"
                    : "bg-muted text-muted-foreground"
                    }`}
                >
                  {opt.available ? "Available" : "Booked"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>Capacity: <span className="text-foreground font-medium">{opt.capacity}</span></p>
                <p>Cost: <span className="text-foreground font-medium">{opt.cost}</span></p>
                <p>ETA: <span className="text-foreground font-medium">{opt.eta}</span></p>
              </div>
              <button
                disabled={!opt.available}
                className="mt-3 w-full py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {opt.available ? "Book Now" : "Unavailable"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Logistics;
