-- ─────────────────────────────────────────────────────────────────
-- BuildBid PH — 20 Sample Open Projects
-- Run this in: Supabase Dashboard → SQL Editor
-- Requires at least one client account in the profiles table.
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  cid TEXT;
BEGIN
  -- Automatically uses the first client in your profiles table
  SELECT id INTO cid FROM profiles WHERE role = 'client' LIMIT 1;

  IF cid IS NULL THEN
    RAISE EXCEPTION 'No client found. Create a client account first, then re-run this script.';
  END IF;

  INSERT INTO projects (
    client_id, title, description, scope_of_work, project_type, status,
    budget_min, budget_max, bid_deadline, start_date, end_date,
    location_address, location_city, location_region
  ) VALUES

  -- ── RESIDENTIAL ──────────────────────────────────────────────
  (cid,
   '3-Bedroom Single-Detached House Construction',
   'Construction of a modern 3-bedroom, 2-bathroom single-detached residential house with a covered garage and garden area.',
   'Complete structural works, roofing, interior partitions, electrical, plumbing, painting, tiling, and landscaping.',
   'residential', 'open', 2500000, 4000000,
   NOW() + INTERVAL '30 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '12 months',
   'Lot 5 Block 3 San Jose Village', 'Quezon City', 'NCR (Metro Manila)'),

  (cid,
   'Two-Story Townhouse Development (4 Units)',
   'Development of a 4-unit townhouse project on a 400 sqm lot. Each unit is two-story with 2 bedrooms.',
   'Site clearing, foundation, structural frame, roofing, interior works, electrical and plumbing installation, perimeter fence.',
   'residential', 'open', 8000000, 12000000,
   NOW() + INTERVAL '21 days', NOW() + INTERVAL '35 days', NOW() + INTERVAL '18 months',
   '12 Mahogany Street', 'Paranaque City', 'NCR (Metro Manila)'),

  (cid,
   'Residential Lot Perimeter Fence and Gate',
   'Construction of a concrete hollow block perimeter fence (80 linear meters) with a sliding steel gate and pedestrian gate.',
   'Excavation, footing, CHB fence wall up to 2.4m height, steel gate fabrication and installation, painting.',
   'residential', 'open', 350000, 550000,
   NOW() + INTERVAL '14 days', NOW() + INTERVAL '21 days', NOW() + INTERVAL '3 months',
   'Brgy. San Roque', 'Marikina City', 'NCR (Metro Manila)'),

  -- ── COMMERCIAL ───────────────────────────────────────────────
  (cid,
   'Commercial Restaurant Build-Out (Ground Floor)',
   'Full interior and exterior build-out of a 180 sqm ground-floor restaurant space in a commercial strip. Includes kitchen exhaust system.',
   'Demolition of existing partitions, new layout, kitchen counters and hoods, restroom renovation, electrical, signage, painting.',
   'commercial', 'open', 3000000, 5000000,
   NOW() + INTERVAL '28 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '6 months',
   '88 Arnaiz Avenue', 'Makati City', 'NCR (Metro Manila)'),

  (cid,
   '5-Storey Commercial Office Building',
   'Construction of a 5-storey reinforced concrete office building with basement parking for 20 vehicles.',
   'Deep excavation, pile foundation, structural concrete works, curtain wall glazing, mechanical, electrical, and plumbing systems.',
   'commercial', 'open', 45000000, 65000000,
   NOW() + INTERVAL '45 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '36 months',
   'Ortigas Business District', 'Pasig City', 'NCR (Metro Manila)'),

  (cid,
   'Convenience Store Interior Fit-Out',
   'Complete interior fit-out of a 60 sqm convenience store space including refrigeration rough-in, shelving, and checkout counter.',
   'Flooring (epoxy), ceiling grid, lighting, electrical rough-in, shelving installation, cashier counter, signage.',
   'commercial', 'open', 500000, 900000,
   NOW() + INTERVAL '10 days', NOW() + INTERVAL '20 days', NOW() + INTERVAL '2 months',
   'SM City North EDSA Vicinity', 'Quezon City', 'NCR (Metro Manila)'),

  -- ── INDUSTRIAL ───────────────────────────────────────────────
  (cid,
   'Cold Storage Warehouse Construction (1,200 sqm)',
   'Construction of a 1,200 sqm pre-engineered metal building warehouse with cold room panels and refrigeration rough-in.',
   'Site preparation, concrete slab on grade, structural steel erection, insulated panel walls and ceiling, dock levelers, electrical.',
   'industrial', 'open', 18000000, 25000000,
   NOW() + INTERVAL '35 days', NOW() + INTERVAL '50 days', NOW() + INTERVAL '24 months',
   'LIIP Industrial Park', 'Calamba City', 'Region IV-A – CALABARZON'),

  (cid,
   'Manufacturing Plant Extension (500 sqm)',
   'Extension of an existing manufacturing plant by adding a 500 sqm production bay with overhead crane rails.',
   'Foundation, structural steel columns and beams, roofing, overhead crane rail installation, electrical panels, fire suppression.',
   'industrial', 'open', 9000000, 14000000,
   NOW() + INTERVAL '40 days', NOW() + INTERVAL '55 days', NOW() + INTERVAL '18 months',
   'Cavite Economic Zone', 'General Trias', 'Region IV-A – CALABARZON'),

  -- ── INFRASTRUCTURE ───────────────────────────────────────────
  (cid,
   'Barangay Road Concreting (1.2 km)',
   'Concreting of a 1.2 km barangay road, 5 meters wide, with standard 20 cm PCCP thickness and proper drainage.',
   'Subgrade preparation, sub-base compaction, formworks, concrete pouring (PCCP), curing, road markings.',
   'infrastructure', 'open', 6000000, 9000000,
   NOW() + INTERVAL '30 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '8 months',
   'Brgy. Sta. Cruz', 'Bulacan', 'Region III – Central Luzon'),

  (cid,
   'Pedestrian Overpass (Footbridge) Construction',
   'Design and build of a 45-meter steel pedestrian overpass over a 4-lane highway with two stairway approaches.',
   'Pile foundation, steel superstructure fabrication and erection, non-slip grating, handrails, lighting, painting.',
   'infrastructure', 'open', 12000000, 18000000,
   NOW() + INTERVAL '60 days', NOW() + INTERVAL '75 days', NOW() + INTERVAL '12 months',
   'Marcos Highway', 'Marikina City', 'NCR (Metro Manila)'),

  (cid,
   'Storm Drainage Canal Rehabilitation (800 m)',
   'Rehabilitation of an 800-meter open drainage canal including desilting, concrete lining, and cover slab installation.',
   'Desilting and cleanout, concrete channel lining, precast cover slabs, inlet boxes, outfall structure.',
   'infrastructure', 'open', 4500000, 7000000,
   NOW() + INTERVAL '25 days', NOW() + INTERVAL '40 days', NOW() + INTERVAL '6 months',
   'Brgy. Gen. T. de Leon', 'Valenzuela City', 'NCR (Metro Manila)'),

  -- ── RENOVATION ───────────────────────────────────────────────
  (cid,
   'Public Elementary School Building Renovation',
   'Complete renovation of a 6-classroom school building including roof replacement, repainting, door/window replacement, and restroom upgrade.',
   'Roof decking and waterproofing, window replacement (jalousie to sliding), restroom tile and fixture replacement, repainting.',
   'renovation', 'open', 2800000, 4200000,
   NOW() + INTERVAL '20 days', NOW() + INTERVAL '35 days', NOW() + INTERVAL '5 months',
   'Escolta Elementary School', 'Manila', 'NCR (Metro Manila)'),

  (cid,
   'Hospital Patient Ward Renovation (3rd Floor)',
   'Renovation of a 600 sqm hospital patient ward including new flooring, ceiling, HVAC rough-in, and nurse station.',
   'Demolition, vinyl tile flooring, gypsum board ceiling, LED lighting, HVAC duct rough-in, nurse station millwork, painting.',
   'renovation', 'open', 6000000, 9500000,
   NOW() + INTERVAL '45 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '8 months',
   'Quirino Ave', 'Manila', 'NCR (Metro Manila)'),

  (cid,
   'Heritage Church Façade Restoration',
   'Restoration of the stone façade of a 200-year-old heritage church including structural crack repair and stone cleaning.',
   'Crack injection grouting, stone replacement, surface cleaning, lime-based repointing, scaffolding works.',
   'renovation', 'open', 3500000, 5500000,
   NOW() + INTERVAL '30 days', NOW() + INTERVAL '50 days', NOW() + INTERVAL '10 months',
   'Intramuros', 'Manila', 'NCR (Metro Manila)'),

  -- ── ELECTRICAL ───────────────────────────────────────────────
  (cid,
   'Solar Rooftop PV System Installation (150 kWp)',
   'Supply and installation of a 150 kWp grid-tied solar PV system on a commercial building rooftop including net metering application.',
   'Solar panel mounting, inverter installation, DC and AC cabling, protection devices, MERALCO interconnection, commissioning.',
   'electrical', 'open', 9000000, 13000000,
   NOW() + INTERVAL '35 days', NOW() + INTERVAL '50 days', NOW() + INTERVAL '6 months',
   'Ayala Avenue', 'Makati City', 'NCR (Metro Manila)'),

  (cid,
   'Industrial Plant Electrical Upgrade (13.2 kV)',
   'Upgrade of an aging industrial plant electrical system from 4.16 kV to 13.2 kV including new transformer and MCC panels.',
   'New transformer pad, MCC panel supply and installation, cable pulling, busway installation, testing and commissioning.',
   'electrical', 'open', 7000000, 11000000,
   NOW() + INTERVAL '40 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '9 months',
   'Batangas Industrial Estate', 'Batangas City', 'Region IV-A – CALABARZON'),

  -- ── PLUMBING ─────────────────────────────────────────────────
  (cid,
   'Residential Subdivision Water Distribution System',
   'Installation of the complete water distribution network for a 120-unit residential subdivision including fire hydrants.',
   'Pipe trenching, HDPE main line installation, service connections, gate valves, fire hydrants, pressure testing.',
   'plumbing', 'open', 4000000, 6500000,
   NOW() + INTERVAL '30 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '10 months',
   'Brgy. Bacao', 'General Trias', 'Region IV-A – CALABARZON'),

  (cid,
   'Sewage Treatment Plant (STP) Construction — 50 CMD',
   'Design and build of a 50 cubic meter per day sewage treatment plant for a residential condominium.',
   'Civil works for STP tanks, mechanical equipment installation, blower systems, effluent polishing, instrumentation.',
   'plumbing', 'open', 5500000, 8500000,
   NOW() + INTERVAL '45 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '12 months',
   'Brgy. Sto. Tomas', 'Bulacan', 'Region III – Central Luzon'),

  -- ── INTERIOR ─────────────────────────────────────────────────
  (cid,
   'Corporate Headquarters Interior Fit-Out (800 sqm)',
   'Full interior design and fit-out of an 800 sqm corporate office across two floors in BGC.',
   'Glass partitions, modular workstations, executive rooms, pantry, reception, server room, flooring, ceiling, lighting design.',
   'interior', 'open', 12000000, 18000000,
   NOW() + INTERVAL '35 days', NOW() + INTERVAL '50 days', NOW() + INTERVAL '7 months',
   'BGC, 32nd Street', 'Taguig City', 'NCR (Metro Manila)'),

  (cid,
   'High-End Restaurant Interior Design and Build',
   'Interior design and build of a 220 sqm fine dining restaurant with a bar area, private dining room, and open kitchen concept.',
   'Custom millwork, decorative ceilings, LED ambient lighting, bar counter fabrication, kitchen pass-through, AV system rough-in.',
   'interior', 'open', 5000000, 8000000,
   NOW() + INTERVAL '25 days', NOW() + INTERVAL '40 days', NOW() + INTERVAL '5 months',
   'Poblacion', 'Makati City', 'NCR (Metro Manila)');

  RAISE NOTICE 'Successfully inserted 20 sample projects under client ID: %', cid;
END $$;
