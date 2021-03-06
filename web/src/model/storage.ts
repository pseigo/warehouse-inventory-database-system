import Database from "../database";
import Inventory from "./storage/inventory";
import Warehouse from "./storage/warehouse";

export default class Storage {
    protected db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public async selectInventoryAndProject(): Promise<Array<Inventory>> {
        const query = {
            text:
                `SELECT serial_num, container_id, type_name, weight FROM inventory`,
            values: [],
        };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(i => {
                return new Inventory(i.serial_num, i.container_id, i.type_name, i.weight, undefined);
            });
        } catch (e) {
            throw new Error('Could not get list of Inventory');
        }
    }

    public async selectInventoryWith(minWeight: number, container: number): Promise<Array<Inventory>> {
        const query = {
            text:
                `SELECT *
                 FROM inventory
                 WHERE weight >= $1 AND
                       container_id = $2`,
            values: [minWeight, container],
        };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(i => {
                return new Inventory(i.serial_num, i.container_id, i.type_name, i.weight, i.manufacture_date);
            });
        } catch (e) {
            throw new Error('Could not get list of Inventory filtered by a minimum weight');
        }
    }

    public async joinInventoryAndStorageContainerOnWarehouseID(warehouseID: number): Promise<Array<Inventory>> {
        const query = {
            text:
                `SELECT I.serial_num, I.container_id, I.type_name, I.weight, I.manufacture_date
                 FROM inventory I, storage_container S
                 WHERE S.warehouse_id = $1 AND I.container_id = S.id`,
            values: [warehouseID],
        };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(i => {
                return new Inventory(i.serial_num, i.container_id, i.type_name, i.weight, i.manufacture_date);
            });
        } catch (e) {
            throw new Error('Could not get list of Inventory');
        }
    }

    /**
      * Returns a list of objects, each with the keys:
      * - typeName
      * - count
      * - volume
      */
    public async inventoryTypesWithSmallerThanAverageVolume(): Promise<Array<Object>> {
      const query = {
          text:
              `SELECT IT.type_name, COUNT(*) as count, (IT.height * IT.width * IT.length) as volume
               FROM inventory_type IT, inventory I
               WHERE I.type_name = IT.type_name
               GROUP BY IT.type_name
               HAVING (IT.height * IT.width * IT.length) < (
                 SELECT AVG(height * width * length)
                 FROM inventory_type
               )
               ORDER BY count DESC, volume ASC;`,
          values: [],
      };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(row => {
                return { typeName: row.type_name, count: row.count, volume: row.volume };
            });
        } catch (e) {
            throw new Error('Failed to query inventory types with smaller than average volume');
        }
    }

    /**
      * Returns a list of objects, each with keys:
      * - warehouse (a Warehouse object)
      * - containerCount (the number of containers in that warehouse)
      */
    public async warehouseContainerCounts(): Promise<Array<Object>> {
        const query = {
            text:
                `SELECT W.id, W.total_volume, W.occupied_volume, W.street_address, W.postal_code, COUNT(*) as container_count
                 FROM storage_container S, warehouse W
                 WHERE W.id = S.warehouse_id
                 GROUP BY W.id`,
            values: [],
        };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(w => {
                return {
                    warehouse: new Warehouse(
                        w.id,
                        w.total_volume,
                        w.occupied_volume,
                        w.street_address,
                        w.postal_code
                    ),
                    containerCount: w.container_count
                };
            });
        } catch (e) {
            throw new Error('Failed to query number of containers per warehouse');
        }
    }

    /**
      * Returns a list of objects, each with keys:
      * - warehouse (a Warehouse object)
      * - containerCount (the number of containers in that warehouse)
      */
    public async aggregationHavingOnWarehouse(num_emp: number): Promise<Array<Object>> {
        const query = {
            text:
                `SELECT W.id, W.total_volume, W.occupied_volume, W.street_address, W.postal_code, COUNT(*) as number_of_personnel
                 FROM warehouse W, personnel P, works_in N
                 WHERE W.id = N.warehouse_id AND P.id = N.pid
                 GROUP BY W.id
                 HAVING COUNT (*) >= $1;`,
            values: [num_emp],
        };

        try {
            const result = await this.db.client.query(query)
            return result.rows.map(res => {
                return {
                    warehouse: new Warehouse(
                        res.id,
                        res.total_volume,
                        res.occupied_volume,
                        res.street_address,
                        res.postal_code
                    ),
                    numberOfPersonnel: res.number_of_personnel
                };
            });
        } catch (e) {
            throw new Error('Could not get list of Warehouses');
        }
    }
}
