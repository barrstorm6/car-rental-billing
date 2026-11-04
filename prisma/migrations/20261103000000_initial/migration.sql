-- Initial database-first schema. SQL is the source of truth.
CREATE TYPE car_class AS ENUM ('ECONOMY', 'SUV');
CREATE TYPE rental_status AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE cars
(
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand        text      NOT NULL,
    model        text      NOT NULL,
    car_class    car_class NOT NULL,
    plate_number text      NOT NULL UNIQUE
);

CREATE TABLE pricing_rules
(
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_class                    car_class NOT NULL UNIQUE,
    daily_rate                   integer   NOT NULL,
    grace_minutes                integer   NOT NULL,
    hourly_late_limit_minutes    integer   NOT NULL,
    late_hourly_rate             integer   NOT NULL,
    included_km_per_day          integer   NOT NULL,
    excess_km_rate               integer   NOT NULL,
    missing_fuel_price_per_liter integer   NOT NULL,
    insurance_daily_rate         integer   NOT NULL,
    long_rental_min_days         integer   NOT NULL,
    long_rental_discount_percent integer   NOT NULL
);

CREATE TABLE rentals
(
    id                 uuid PRIMARY KEY        DEFAULT gen_random_uuid(),
    car_id             uuid           NOT NULL REFERENCES cars (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    scheduled_start_at timestamptz(3) NOT NULL,
    scheduled_end_at   timestamptz(3) NOT NULL,
    start_odometer_km  integer        NOT NULL,
    insurance_selected boolean        NOT NULL,
    status             rental_status  NOT NULL DEFAULT 'OPEN',
    created_at         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rental_returns
(
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id           uuid           NOT NULL UNIQUE REFERENCES rentals (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    actual_return_at    timestamptz(3) NOT NULL,
    end_odometer_km     integer        NOT NULL,
    missing_fuel_liters integer        NOT NULL
);

CREATE TABLE rental_invoices
(
    id           uuid PRIMARY KEY        DEFAULT gen_random_uuid(),
    rental_id    uuid           NOT NULL UNIQUE REFERENCES rentals (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    breakdown    jsonb          NOT NULL,
    total_amount integer        NOT NULL,
    currency     text           NOT NULL,
    created_at   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX rentals_car_id_idx ON rentals (car_id);
CREATE INDEX rentals_status_idx ON rentals (status);
