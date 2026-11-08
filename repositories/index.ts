import {prisma} from "@/lib/prisma";
import {RentalInvoiceModel} from "@/generated/prisma/models/RentalInvoice";
import {Car} from "@/generated/prisma/client";

export async function getRentals(rentalId:string){
return prisma.rental.findUnique({
    where:{
      id:rentalId,
    },
    include:{
        invoice:true
    }
})
}

export async function getCar(carId:string){
    return prisma.car.findUnique({
       where:{
           id:carId
       }
    })
}

export async function getPricingRule(car: Car) {
    return prisma.pricingRule.findUnique({
        where: {
            carClass: car.carClass,
        },
    });
}


export async function getRentalReturns(returnsId:string){
    return prisma.rentalReturn.findUnique({
        where:{
            id:returnsId,
        }
    })
}

export async function getRentalInvoice(rentalId:string):Promise<RentalInvoiceModel | null>{
    return prisma.rentalInvoice.findUnique({
        where:{
            id:rentalId,
        }
    })
}

