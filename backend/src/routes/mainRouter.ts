import express, { Router } from "express";
import Database from "../database";
import TestRoute from "./test/testRoute";
import PersonnelRoute from "./personnel/personnelRoute";

export default class MainRouter {
    public router: Router;
    private testRoute: TestRoute;
    private personnelRoute: PersonnelRoute;

    constructor(db: Database) {
        this.router = express.Router();
        this.testRoute = new TestRoute(db);
        this.personnelRoute = new PersonnelRoute(db);
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.viewRoute();
        this.router.use("/test", this.testRoute.router);
        this.router.use("/personnel", this.personnelRoute.router);
    }

    private viewRoute(): void {
        this.router.get("/", (req, res) => {
            res.render('backend/page/index.ejs', { title: 'Warehouse Dashboard'} );
        });

        this.router.get("/about", (req, res) => {
            res.render('backend/page/about.ejs', { title: 'About this app'} );
        });
    }
}
